import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    mobile: {
        type: String,
        required: [true, 'must provide the mobile number!'],
        trim: true,
        maxlength: [10, `name can't be more than 10 characters!`],
        unique:true
    },
    otp: {
        type: String,
        default: "",
    },
    email: {
        type: String,
        default: "",
    },
    username: {
        type: String,
        default: "",
    },
    createdBy: {
        type: String,
        default: "",
    },
    createdAt: {
        type: Date,
		default: Date.now,
    },
    updatedBy: {
        type: String,
        default: "",
    },
    updatedAt: {
        type: Date,
		default: Date.now,
    },
    status: {
        type: String,
        enum: ['Active', 'InActive'],
        default: 'Active'
    },
    profilePic: {
        type: String,
        default: "",
    },
    bio: {
        type: String,
        default: "",
    },
    age: {
        type: Number,
        default: "",
    },
    gender: {
        type: String,
        default: "",
    },
    address: {
        type: String,
        default: "",
    },
    language: {
        type: String,
        default: "",
    },
    country: {
        type: String,
        default: "",
    },
    deviceToken: {
        type: String,
        default: "",
    },
    callStatus: {
        type: String,
        enum: ['Available', 'OnCall','calling'],
        default: 'Available'
    },
    token: {
        type: String,
        default: "",
    },
    isDeleted: {
        type: Boolean,
        default: 0
    },
});

export default mongoose.model('users', userSchema);
