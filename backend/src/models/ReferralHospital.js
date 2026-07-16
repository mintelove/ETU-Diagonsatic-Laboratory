import mongoose from 'mongoose';
const schema=new mongoose.Schema({
name:{type:String,required:true,trim:true,unique:true,maxlength:120},
code:{type:String,trim:true,uppercase:true,maxlength:30},phone:{type:String,trim:true,maxlength:30,default:''},email:{type:String,trim:true,lowercase:true,maxlength:120,default:''},address:{type:String,trim:true,maxlength:240,default:''},city:{type:String,trim:true,maxlength:80,default:''},contactPerson:{type:String,trim:true,maxlength:120,default:''},description:{type:String,trim:true,maxlength:500,default:''},active:{type:Boolean,default:true},createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
},{timestamps:{createdAt:'createdDate',updatedAt:'updatedDate'},versionKey:false});
schema.index({active:1,name:1});
export default mongoose.model('ReferralHospital',schema);
