import type {MetadataRoute} from 'next';
import {BRAND} from '@/lib/brand';
export default function manifest():MetadataRoute.Manifest{return {name:BRAND.product,short_name:BRAND.product,description:`Conference operations for ${BRAND.conferenceName}`,start_url:'/chair',display:'standalone',background_color:'#f6f8fb',theme_color:'#2b4e16',icons:[{src:'/phesmun-icon-192.png',sizes:'192x192',type:'image/png'},{src:'/phesmun-icon-512.png',sizes:'512x512',type:'image/png'}]};}
