import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BookHeart, LoaderCircle, LockKeyhole } from 'lucide-react';
import './styles.css';

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}) : null;
if (typeof window!=='undefined') {
  window.__SUPABASE_CONFIG__={url,key};
  // Share the exact authenticated client with the same-origin legacy iframe.
  // This avoids a second auth client reading a different/stale session.
  window.__SUPABASE_CLIENT__=supabase;
}

function Auth(){
 const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function submit(e){e.preventDefault();setBusy(true);setMessage('');try{if(mode==='signup'){const {error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});if(error)throw error;setMessage('Pendaftaran berhasil. Periksa email untuk verifikasi.')}else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error}}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 return <main className="auth"><section className="auth-art"><div className="art-book"><BookHeart size={70}/><span>OUR LITTLE STORY</span></div><h1>Setiap momen kecil,<br/><i>layak dikenang selamanya.</i></h1></section><form className="auth-form" onSubmit={submit}><div className="brand"><BookHeart/><span><b>Ensiklopedia</b><small>KENANGAN ANAK</small></span></div><p className="eyebrow">RUANG KENANGAN KELUARGA</p><h2>{mode==='login'?'Selamat datang kembali':'Buat akun keluarga'}</h2><p className="muted">Masuk untuk membuka buku kenangan keluarga.</p>{mode==='signup'&&<label>Nama lengkap<input value={name} onChange={e=>setName(e.target.value)} required/></label>}<label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" minLength="6" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{message&&<div className="message">{message}</div>}<button className="primary" disabled={busy}>{busy?<LoaderCircle className="spin"/>:null}{mode==='login'?'Masuk':'Daftar'}</button><p className="switch">{mode==='login'?'Belum punya akun?':'Sudah punya akun?'} <button type="button" onClick={()=>{setMode(mode==='login'?'signup':'login');setMessage('')}}>{mode==='login'?'Daftar':'Masuk'}</button></p><small className="secure"><LockKeyhole size={13}/> Enkripsi AES-GCM dan Kunci Keluarga tetap digunakan oleh buku asli.</small></form></main>
}
export default function App(){
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{if(!supabase){setLoading(false);return}supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
 if(!url||!key)return <div className="config"><BookHeart size={42}/><h1>Hubungkan Supabase</h1><p>Isi <code>.env</code> dengan VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY (atau VITE_SUPABASE_ANON_KEY), lalu jalankan ulang Vite.</p></div>;
 if(loading)return <div className="loading"><LoaderCircle className="spin"/> Menyiapkan ruang kenangan...</div>;
 if(!session)return <Auth/>;
 return <div className="engine-shell"><div className="engine-bar"><span><BookHeart size={17}/> Ensiklopedia Kenangan Anak</span><button onClick={()=>supabase.auth.signOut()}>Keluar akun</button></div><iframe title="Buku Kenangan 3D" src="/legacy-engine.html" allow="fullscreen; clipboard-read; clipboard-write"/></div>
}
