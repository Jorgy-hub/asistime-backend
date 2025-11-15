import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@ObjectType()
@Schema()
export class User {
    @Field(() => String)
    @Prop({required: true, unique: true})
    username: string;

    @Field(() => String)
    @Prop({required: true})
    password: string;

    @Field(() => Boolean)
    @Prop({default: false})
    admin: boolean;

    @Prop({ default: null })
    refresh_token: string;

    @Field(() => [String])
    @Prop({ type: [String], default: [] })
    permissions: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);