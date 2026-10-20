import { Router } from 'express';
import { Schema, model } from 'mongoose';
import type { Server } from 'socket.io';
import { User, AuditLog } from '../models';
import { requireAuth, type AuthRequest } from '../middleware/auth';
const palettes=['green','pink','blue','amber','teal','violet','coral','navygold','mint','burgundy','indigo','slate'];
const Appearance=model('Appearance',new Schema({_id:{type:String,default:'global'},palette:{type:String,enum:palettes,default:'green'},updated_by:{type:Schema.Types.ObjectId,ref:'User'}},{timestamps:true}));
export function createAppearanceRouter(io:Server){
 const router=Router();
 router.get('/palettes',(_req,res)=>res.json({palettes}));
 router.get('/',async(_req,res)=>{try{const saved=await Appearance.findById('global');res.json({palette:saved?.palette??'green'});}catch{res.status(503).json({error:'Appearance is temporarily unavailable'});}});
 router.put('/',requireAuth,async(req:AuthRequest,res)=>{
  try{
   const user=await User.findById(req.userId);
   if(user?.role!=='admin')return res.status(403).json({error:'Administrator access required'});
   if(typeof req.body.palette!=='string'||!palettes.includes(req.body.palette))return res.status(400).json({error:'Select a supported color theme'});
   const saved=await Appearance.findByIdAndUpdate('global',{$set:{palette:req.body.palette,updated_by:req.userId}},{upsert:true,new:true,runValidators:true});
   await AuditLog.create({actor_id:req.userId,action:'Brand color updated',resource:req.body.palette});
   const value={palette:saved!.palette};io.emit('appearance_updated',value);return res.json(value);
  }catch{return res.status(500).json({error:'Unable to save appearance. Please retry.'});}
 });
 return router;
}
