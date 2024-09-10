// src/models/Role.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IRole extends Document {
  name: string;
}

const RoleSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
});

export default mongoose.model<IRole>("Role", RoleSchema);
