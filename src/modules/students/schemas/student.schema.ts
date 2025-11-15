import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type StudentDocument = HydratedDocument<Student>;


@ObjectType()
export class EntranceLog {
    @Field(() => Number)
    at: number;

    @Field(() => Boolean)
    exit: boolean;

    @Field(() => Boolean)
    accepted: boolean;

    @Field(() => Boolean)
    suspended?: boolean;
}

@ObjectType()
export class Report {
    @Field(() => String)
    reason: string;
    
    @Field(() => Number)
    at: number;

    @Field(() => String)
    reported_by: string;

    @Field(() => Number)
    due_date: number;

    @Field(() => Boolean)
    suspended: boolean;
}

@ObjectType()
@Schema()
export class Student {
    @Field(() => ID)
    @Prop({required: true, unique: true})
    id: string;
    
    @Field(() => String)
    @Prop({required: true})
    name: string;

    @Field(() => String)
    @Prop()
    career: string;

    @Field(() => String)
    @Prop()
    prev_semester: string;

    @Field(() => String)
    @Prop()
    semester: string;

    @Field(() => String)
    @Prop()
    gender: string;

    @Field(() => String)
    @Prop()
    age: string;

    @Field(() => String)
    @Prop()
    shift: string;
    
    @Field(() => String)
    @Prop()
    prev_group: string;

    @Field(() => String)
    @Prop()
    group: string;

    @Field(() => [EntranceLog])
    @Prop({default: []})
    logs: EntranceLog[];

    @Field(() => [Report])
    @Prop({default: []})
    reports?: Report[];
}

export const StudentSchema = SchemaFactory.createForClass(Student);