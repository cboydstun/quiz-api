import mongoose, { Document, Schema } from 'mongoose';

export interface IBadge extends Document {
    name: string;
    description: string;
    imageUrl: string;
    earnedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const BadgeSchema: Schema = new Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model<IBadge>('Badge', BadgeSchema);
