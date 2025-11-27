import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Student } from "../schemas/student.schema";
import { Model } from "mongoose";
import { StudentsDto } from "../dtos/students.dto";
import * as QRCode from "qrcode";
import * as path from 'path';
import * as sharp from "sharp";
import * as xlsx from "xlsx";
import Config from "../../../config";
import { EventsGateway } from "../../../events/events.gateway";
import { exit } from "process";

type StudentDoc = {
  _id: any;
  id: string;
  name: string;
  career?: string;
  prev_semester?: string;
  semester?: string;
  gender?: string;
  age?: string;
  shift?: string;
  prev_group?: string;
  group?: string;
  logs?: any[];
};

@Injectable()
export class StudentsService {
    constructor(
        @InjectModel(Student.name) private studentModel: Model<Student>,
        private readonly events: EventsGateway,
    ) { }

    async register(studentsDto: StudentsDto): Promise<Student> {
        return this.studentModel.create(studentsDto);
    }

    async markAccess(id: string, exit: boolean): Promise<Student> {
        const now = Date.now();

        // helpers to parse due_date reliably
        const toMillis = (raw: unknown): number | null => {
            if (raw == null) return null;
            if (typeof raw === 'number') return raw > 0 ? raw : null;
            if (typeof raw === 'string') {
                const s = raw.trim();
                if (/^\d+$/.test(s)) {
                    const n = Number(s);
                    return n > 0 ? n : null; // numeric string epoch ms
                }
                const t = Date.parse(s); // ISO or date-like string
                return Number.isFinite(t) && t > 0 ? t : null;
            }
            return null;
        };
        const endOfDayLocal = (ms: number): number => {
            const d = new Date(ms);
            d.setHours(23, 59, 59, 999);
            return d.getTime();
        };
        const normalizeDue = (raw: unknown): number | null => {
            if (raw == null) return null;
            if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
                // date-only string => use end of that day (local)
                return endOfDayLocal(Date.parse(raw));
            }
            return toMillis(raw);
        };

        // Suspension check
        const studentForSuspension = await this.studentModel.findOne(
            { id },
            { id: 1, name: 1, reports: 1 }
        ).lean();
        if (!studentForSuspension) throw new NotFoundException('Student not found');

        const hasActiveSuspension =
            Array.isArray((studentForSuspension as any).reports) &&
            (studentForSuspension as any).reports.some((r: any) => {
                if (!r || r.suspended !== true) return false;
                const due = normalizeDue(r.due_date);
                // active if indefinite (null) or due in the future
                return due === null || due > now;
            });

        if (!exit && hasActiveSuspension) {
            const blocked = await this.studentModel.findOneAndUpdate(
                { id },
                { $push: { logs: { at: now, exit: false, accepted: false, suspended: hasActiveSuspension } } },
                { new: true }
            );
            this.events.studentLogged({
                id: blocked!.id,
                name: blocked!.name,
                at: now,
                exit: false,
                accepted: false
            });
            return blocked!;
        }

        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
        const start = startOfDay.getTime();
        const end = endOfDay.getTime();

        // find the last ACCEPTED log today (ignore rejected attempts)
        const [doc] = await this.studentModel.aggregate([
            { $match: { id } },
            {
                $project: {
                    lastAcceptedToday: {
                        $let: {
                            vars: {
                                todayAcceptedLogs: {
                                    $filter: {
                                        input: '$logs',
                                        as: 'l',
                                        cond: {
                                            $and: [
                                                { $gte: ['$$l.at', start] },
                                                { $lte: ['$$l.at', end] },
                                                { $eq: ['$$l.accepted', true] }
                                            ]
                                        }
                                    }
                                }
                            },
                            in: { $arrayElemAt: ['$$todayAcceptedLogs', -1] }
                        }
                    }
                }
            }
        ]).exec();

        const last = doc?.lastAcceptedToday as { at: number; exit: boolean } | undefined;

        // acceptance rules using the last ACCEPTED state
        const accepted = exit
            ? !!last && last.exit === false
            : !last || last.exit === true;

        const student = await this.studentModel.findOneAndUpdate(
            { id },
            { $push: { logs: { at: now, exit, accepted } } },
            { new: true }
        );
        if (!student) throw new NotFoundException('Student not found');

        this.events.studentLogged({ id: student.id, name: student.name, at: now, exit, accepted });

        if (accepted) {
            this.events.studentCountCurrentlyInside(await this.countCurrentlyInside());
            this.events.studentCountCurrentlyOutside(await this.countCurrentlyOutside());
        }

        return student;
    }

    async getStudentById(id: string): Promise<Student> {
        return this.studentModel.findOne({ id: id });
    }

    async getAllStudents(): Promise<Student[]> {
        return this.studentModel.find().exec();
    }

    async filterStudents(filters?: { name?: string; id?: string; group?: string; semester?: string; career?: string; shift?: string }): Promise<Student[]> {
        const f = filters ?? {};
        const query: any = {};

        const trim = (v?: string) => (typeof v === 'string' ? v.trim() : v);

        if (trim(f.group)) query.group = trim(f.group);
        if (trim(f.semester)) query.semester = trim(f.semester);
        if (trim(f.career)) query.career = trim(f.career);
        if (trim(f.shift)) query.shift = trim(f.shift);
        if (trim(f.name)) query.name = { $regex: trim(f.name), $options: 'i' };
        if (trim(f.id)) query.id = { $regex: trim(f.id), $options: 'i' };

        if (Object.keys(query).length === 0) {
            return this.studentModel.find().exec(); // no filters => return all
        }
        return this.studentModel.find(query).exec();
    }

    async generateQr(id: string): Promise<Student> {
        const student = await this.studentModel.findOne({ id: id });
        try {
            const filePath = path.join(__dirname, `../../../../qrs/${student.id}.png`);
            const logoPath = path.join(__dirname, `../../../../public/logo.png`);

            const qrCodeBuffer = await QRCode.toBuffer(`${Config.apiUrl}/students/${student.id}`, { errorCorrectionLevel: 'H', width: 500 });

            const resizedLogoBuffer = await sharp(logoPath)
                .resize(200, 200, { fit: 'inside' })
                .toBuffer();

            await sharp(qrCodeBuffer)
                .composite([{ input: resizedLogoBuffer, gravity: 'center' }])
                .toFile(filePath);

            return student;
        } catch (err) {
            throw err;
        }
    }

    async generateDbQrs(): Promise<Student[]> {
        const students = await this.getAllStudents();
        for (const student of students) {
            await this.generateQr(student.id);
        }

        return students;
    }

    private parseExcel(type: 0 | 1, file?: Express.Multer.File) {
        if (!file) throw new BadRequestException("Archivo faltante");
        const wb = xlsx.read(file.buffer, { type: "buffer" });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const ref = sheet["!ref"];
        if (!ref) throw new BadRequestException("Hoja vacía");

        if (type === 1) {
            // A4:J(last) -> id,name,career,prev_sem,sem,gender,age,shift,prev_group,group
            const rng = "A4:J" + xlsx.utils.decode_range(ref).e.r;
            const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, range: rng });
            const rows = data.filter((r) => r.length && r[0] && r[1]);
            return rows.map((row) => ({
                id: String(row[0]).trim(),
                name: String(row[1]).trim(),
                career: String(row[2] ?? "").trim(),
                prev_semester: String(row[3] ?? "").trim(),
                semester: String(row[4] ?? "").trim(),
                gender: String(row[5] ?? "").trim(),
                age: String(row[6] ?? "").trim(),
                shift: String(row[7] ?? "").trim(),
                prev_group: String(row[8] ?? "").trim(),
                group: String(row[9] ?? "").trim(),
                logs: [],
            }));
        } else {
            // B9:F(last) -> id,name,career,shift,group (new 1st semester)
            const rng = "B9:F" + xlsx.utils.decode_range(ref).e.r;
            const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, range: rng });
            const rows = data.filter((r) => r.length && r[0] && r[1]);
            return rows.map((row) => ({
                id: String(row[0]).trim(),
                name: String(row[1]).trim(),
                career: String(row[2] ?? "").trim(),
                shift: String(row[3] ?? "").trim(),
                group: String(row[4] ?? "").trim(),
                semester: "1",
                prev_semester: "",
                gender: "",
                age: "",
                prev_group: "",
                logs: [],
            }));
        }
    }

    async importExcelToDb(
        type: 0 | 1,
        file?: Express.Multer.File
    ): Promise<{ inserted: number; updated: number; deleted: number; totalIncoming: number }> {
        const students = this.parseExcel(type, file);
        let inserted = 0;
        let updated = 0;
        let deleted = 0;

        // Upsert all incoming
        for (const s of students) {
            const res = await this.studentModel.updateOne(
                { id: s.id },
                {
                    $set: { ...s, logs: undefined },
                    $setOnInsert: { logs: [] },
                },
                { upsert: true }
            );
            inserted += res.upsertedCount ? 1 : 0;
            updated += !res.upsertedCount && res.modifiedCount ? 1 : 0;
        }

        // For type 1, delete previous 4th-semester students not present anymore
        if (type === 1) {
            const incomingIds = students.map((s) => s.id);
            const delRes = await this.studentModel.deleteMany({
                semester: "4",
                id: { $nin: incomingIds },
            });
            deleted = (delRes as any).deletedCount || 0;
        }

        return { inserted, updated, deleted, totalIncoming: students.length };
    }

    async cleanAllLogs(id: string): Promise<Student> {
        const student = await this.studentModel.findOne({ id });
        if (!student) throw new NotFoundException('Student not found');
        student.logs = [];
        return student.save();
    }

    async cleanDbLogs(): Promise<{ cleaned: number }> {
        const result = await this.studentModel.updateMany({}, { $set: { logs: [] } });
        return { cleaned: result.modifiedCount };
    }

    async countCurrentlyInside(): Promise<number> {
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
        const start = startOfDay.getTime();
        const end = endOfDay.getTime();

        const pipeline = [
            {
                $project: {
                    lastAcceptedToday: {
                        $let: {
                            vars: {
                                todayAcceptedLogs: {
                                    $filter: {
                                        input: '$logs',
                                        as: 'l',
                                        cond: {
                                            $and: [
                                                { $gte: ['$$l.at', start] },
                                                { $lte: ['$$l.at', end] },
                                                { $eq: ['$$l.accepted', true] }
                                            ]
                                        }
                                    }
                                }
                            },
                            in: { $arrayElemAt: ['$$todayAcceptedLogs', -1] }
                        }
                    }
                }
            },
            { $match: { 'lastAcceptedToday.exit': false } },
            { $count: 'present' }
        ];

        const res = await this.studentModel.aggregate(pipeline).exec();
        return res.length ? res[0].present : 0;
    }

    async countCurrentlyOutside(): Promise<number> {
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
        const start = startOfDay.getTime();
        const end = endOfDay.getTime();

        const pipeline = [
            {
                $project: {
                    lastAcceptedToday: {
                        $let: {
                            vars: {
                                todayAcceptedLogs: {
                                    $filter: {
                                        input: '$logs',
                                        as: 'l',
                                        cond: {
                                            $and: [
                                                { $gte: ['$$l.at', start] },
                                                { $lte: ['$$l.at', end] },
                                                { $eq: ['$$l.accepted', true] }
                                            ]
                                        }
                                    }
                                }
                            },
                            in: { $arrayElemAt: ['$$todayAcceptedLogs', -1] }
                        }
                    }
                }
            },
            // Only those who HAVE a last accepted log today AND it is an exit
            { $match: { lastAcceptedToday: { $ne: null }, 'lastAcceptedToday.exit': true } },
            { $count: 'outside' } // keep 'absent' if your API expects that key
        ];

        const res = await this.studentModel.aggregate(pipeline).exec();
        return res.length ? res[0].outside : 0;
    }

    async countTotalStudents(): Promise<number> {
        return this.studentModel.countDocuments().exec();
    }

    async countNewStudents(): Promise<number> {
        return this.studentModel.countDocuments({ semester: '1' }).exec();
    }

    async listCurrentlyInside(): Promise<Student[]> {
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
        const start = startOfDay.getTime();
        const end = endOfDay.getTime();

        const pipeline = [
            {
                $project: {
                    doc: '$$ROOT',
                    lastAcceptedToday: {
                        $let: {
                            vars: {
                                todayAcceptedLogs: {
                                    $filter: {
                                        input: '$logs',
                                        as: 'l',
                                        cond: {
                                            $and: [
                                                { $gte: ['$$l.at', start] },
                                                { $lte: ['$$l.at', end] },
                                                { $eq: ['$$l.accepted', true] }
                                            ]
                                        }
                                    }
                                }
                            },
                            in: { $arrayElemAt: ['$$todayAcceptedLogs', -1] }
                        }
                    }
                }
            },
            { $match: { 'lastAcceptedToday.exit': false } },
            { $replaceRoot: { newRoot: '$doc' } }
        ];

        return this.studentModel.aggregate(pipeline).exec();
    }

    async countTotalLoginsToday(): Promise<number> {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const start = startOfDay.getTime();
        const end = endOfDay.getTime();

        const pipeline: any[] = [
            { $unwind: { path: '$logs' } },
            { $match: { 'logs.at': { $gte: start, $lte: end }, 'logs.exit': false, 'logs.accepted': true } },
            { $count: 'logins' }
        ];

        const res = await this.studentModel.aggregate(pipeline).exec();
        return res.length ? res[0].logins : 0;
    }

    async addReport(id: string, report: Report): Promise<Student> {
        console.log('Adding report to student ID:', id, 'Report:', report);
        const student = await this.studentModel.findOneAndUpdate(
            { id },
            { $push: { reports: report } },
            { new: true }
        );
        if (!student) throw new NotFoundException('Student not found');
        return student;
    }

    async removeReport(id: string, at: number): Promise<Student> {
        const student = await this.studentModel.findOneAndUpdate(
            { id },
            { $pull: { reports: { at } } },
            { new: true }
        );
        if (!student) throw new NotFoundException('Student not found');
        return student;
    }

    async editReport(id: string, at: number, updatedReport: Partial<Report>): Promise<Student> {
        const student = await this.studentModel.findOne({ id });
        if (!student) throw new NotFoundException('Student not found');

        const reportIndex = student.reports.findIndex(r => r.at === at);
        if (reportIndex === -1) throw new NotFoundException('Report not found');

        student.reports[reportIndex] = { ...student.reports[reportIndex], ...updatedReport };
        return student.save();
    }

    async getUri(id: string) {
        const uri = await fetch(`http://localhost:${Config.apiPort}/getUri`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        if (!uri.ok) throw new NotFoundException('App class not found');

        const data = await uri.json();
        return data.redirect_uri;
    }
}