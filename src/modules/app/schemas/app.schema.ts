import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type AppClassDocument = HydratedDocument<AppClass>;

@ObjectType()
@Schema()
export class AppClass {
    @Field(() => ID)
    @Prop({required: true, unique: true})
    id: string;
    
    @Field(() => String)
    @Prop({required: true})
    redirect_uri: string;
}

export const AppClassSchema = SchemaFactory.createForClass(AppClass);