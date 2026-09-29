import { useCallback,useEffect,useState } from 'react';
import { quickbiteApi } from '../../services/api/quickbiteApi';
import type { LoyaltyRedemption,LoyaltyReward,LoyaltySettings } from '../../types/loyalty';

export function useLoyalty(userId:string|undefined,_orders?:unknown){
 void _orders;
 const [settings,setSettings]=useState<LoyaltySettings|null>(null);
 const [rewards,setRewards]=useState<LoyaltyReward[]>([]);
 const [redemptions,setRedemptions]=useState<LoyaltyRedemption[]>([]);
 const [availablePoints,setAvailablePoints]=useState(0);const [loading,setLoading]=useState(Boolean(userId));const [error,setError]=useState<string|null>(null);
 const refresh=useCallback(async()=>{if(!userId){setAvailablePoints(0);setLoading(false);return}try{setError(null);const r=await quickbiteApi().studentRewards();setSettings({id:true,enabled:r.enabled,points_per_currency_unit:0.01,updated_at:new Date().toISOString()});setAvailablePoints(Number(r.availablePoints??0));setRewards((r.rewards??[]).map((x:any)=>({id:x.reward_id,product_id:x.product_id,title:x.title,description:x.reward_description??null,points_required:Number(x.points_required),active:Boolean(x.active),created_at:x.created_at??new Date().toISOString(),updated_at:x.updated_at??new Date().toISOString(),product:{name:x.product_name,image_url:x.image_url}})));setRedemptions((r.redemptions??[]) as LoyaltyRedemption[])}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar el programa de puntos.')}finally{setLoading(false)}},[userId]);
 useEffect(()=>{void refresh();if(!userId)return;const id=window.setInterval(()=>void refresh(),30000);return()=>window.clearInterval(id)},[refresh,userId]);
 const redeem=useCallback(async(rewardId:string)=>{const r=await quickbiteApi().redeemReward(rewardId);await refresh();return r.redemption},[refresh]);
 return {availablePoints,enabled:settings?.enabled===true,error,loading,redeem,redemptions,rewards,settings,refresh};
}
