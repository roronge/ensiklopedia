/* Supabase compatibility bridge for the original Ensiklopedia Kenangan engine.
   The original 3D/2D/crypto modules remain intact; this adapts its document API to Supabase. */
(async function () {
  'use strict';
  const parent = window.parent;
  const cfg = parent && parent.__SUPABASE_CONFIG__;
  // Reuse the React app's client to guarantee the same authenticated session.
  // Fallback keeps the original HTML usable on its own.
  const parentClient = parent && parent.__SUPABASE_CLIENT__;
  if (!parentClient && (!cfg?.url || !cfg?.key || !window.supabase?.createClient)) {
    window.__legacyBridgeError = 'Konfigurasi Supabase tidak ditemukan. Periksa file .env.';
    return;
  }
  const sb = parentClient || window.supabase.createClient(cfg.url, cfg.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.__legacySupabase = sb;
  let user = null, familyId = null, familyRole = null;
  const subs = new Set();
  const fail = (e) => { const x = new Error(e?.message || 'Supabase request failed'); x.code = e?.code || (e?.status === 403 ? 'invalid_argument' : 'unavailable'); throw x; };
  async function refreshMembership() {
    const { data: { user: u } } = await sb.auth.getUser(); user = u;
    if (!u) { familyId = null; familyRole = null; return; }
    const { data, error } = await sb.from('legacy_family_members').select('family_id,role').eq('user_id',u.id).maybeSingle();
    if (error) fail(error);
    familyId = data?.family_id || null; familyRole = data?.role || null;
  }
  const snapDoc = (id, data) => ({ id, exists: !!data, data: () => data ? structuredClone(data) : undefined });
  function querySnap(rows, previous = new Map()) {
    const next = new Map(rows.map(r => [r.doc_id, r.data]));
    const changes = [];
    for (const [id, data] of next) changes.push({type:previous.has(id)?'modified':'added',doc:snapDoc(id,data)});
    for (const [id,data] of previous) if (!next.has(id)) changes.push({type:'removed',doc:snapDoc(id,data)});
    return { docs: rows.map(r=>snapDoc(r.doc_id,r.data)), docChanges:()=>changes };
  }
  async function readDoc(collection,id) {
    if (collection === 'family') {
      await refreshMembership();
      if (!familyId) return null;
      const {data,error}=await sb.from('legacy_families').select('vault').eq('id',familyId).maybeSingle();
      if(error) fail(error); return data?.vault || null;
    }
    if (!familyId) return null;
    const {data,error}=await sb.from('legacy_documents').select('data').eq('family_id',familyId).eq('collection_name',collection).eq('doc_id',id).maybeSingle();
    if(error) fail(error); return data?.data || null;
  }
  async function writeDoc(collection,id,value,mode='set') {
    await refreshMembership();
    if (collection === 'family') {
      if (mode === 'set') {
        if (!familyId) {
          const { data: sessionData, error: sessionError } = await sb.auth.getSession();
          const sessionUserId = sessionData?.session?.user?.id || null;
          const accessToken = sessionData?.session?.access_token || '';
          let jwtSub = null, jwtRole = null;
          try {
            const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
            jwtSub = payload.sub || null;
            jwtRole = payload.role || null;
          } catch (_) {}
          console.group('[Ensiklopedia] Diagnostik pembuatan ruang keluarga');
          console.log('Bridge memakai client React:', !!parentClient && sb === parentClient);
          console.log('auth.getUser user.id:', user?.id || null);
          console.log('auth.getSession session.user.id:', sessionUserId);
          console.log('JWT sub:', jwtSub, '| JWT role:', jwtRole);
          console.log('Session error:', sessionError || null);
          console.groupEnd();
          if (sessionError) throw sessionError;
          if (!sessionUserId || !jwtSub || jwtRole !== 'authenticated' || sessionUserId !== jwtSub) {
            throw new Error('Sesi Supabase tidak valid untuk INSERT. Periksa Console: [Ensiklopedia] Diagnostik pembuatan ruang keluarga.');
          }
          // Generate the UUID client-side so INSERT does not need RETURNING/SELECT.
          // The SELECT policy requires family membership, which is created immediately
          // after this insert. Asking for .select('id') here would try to read the row
          // before the owner membership exists and can be rejected by RLS.
          const newFamilyId = crypto.randomUUID();
          const { error } = await sb.from('legacy_families').insert({
            id: newFamilyId,
            owner_id: sessionUserId,
            vault: value
          });
          if (error) {
            console.error('[Ensiklopedia] INSERT legacy_families gagal', {
              code: error.code, message: error.message, details: error.details, hint: error.hint,
              sessionUserId, jwtSub, jwtRole, sameClient: !!parentClient && sb === parentClient
            });
            fail(error);
          }
          familyId = newFamilyId;
          familyRole = 'owner';
          const { error: me } = await sb.from('legacy_family_members').insert({
            family_id: familyId,
            user_id: sessionUserId,
            role: 'owner'
          });
          if (me) {
            console.error('[Ensiklopedia] INSERT owner membership gagal', {
              code: me.code, message: me.message, details: me.details, hint: me.hint,
              familyId, sessionUserId
            });
            fail(me);
          }
        } else {
          const {error}=await sb.from('legacy_families').update({vault:value}).eq('id',familyId); if(error) fail(error);
        }
      } else {
        const cur=await readDoc('family','main'); if(!cur) throw new Error('Ruang keluarga tidak ditemukan');
        const next={...cur,...value}; const {error}=await sb.from('legacy_families').update({vault:next}).eq('id',familyId); if(error) fail(error);
      }
      return;
    }
    if (!familyId) throw new Error('Ruang keluarga belum tersedia');
    const cur=mode==='update'?await readDoc(collection,id):null;
    const data=mode==='update'?{...(cur||{}),...value}:value;
    const {error}=await sb.from('legacy_documents').upsert({family_id:familyId,collection_name:collection,doc_id:id,data},{onConflict:'family_id,collection_name,doc_id'});
    if(error) fail(error);
    // Member profile markers stay in legacy_documents. Membership roles are never self-elevated here.

  }
  async function deleteDoc(collection,id) {
    await refreshMembership();
    if(collection==='family') { if(familyId){const {error}=await sb.from('legacy_families').delete().eq('id',familyId);if(error)fail(error);familyId=null;} return; }
    const {error}=await sb.from('legacy_documents').delete().eq('family_id',familyId).eq('collection_name',collection).eq('doc_id',id); if(error)fail(error);
    // Membership removal is a separate owner/admin operation, not a profile-document delete.

  }
  const db = {
    doc(path) {
      const [collection,id]=path.split('/');
      return {
        get:async()=>snapDoc(id,await readDoc(collection,id)),
        set:async(value)=>writeDoc(collection,id,value,'set'),
        update:async(value)=>writeDoc(collection,id,value,'update'),
        delete:async()=>deleteDoc(collection,id),
        onSnapshot:(next,error)=>{
          let live=true, channel=null;
          const load=async()=>{try{const d=await readDoc(collection,id);if(live)next(snapDoc(id,d));}catch(e){if(error)error(e)}};
          load();
          (async()=>{await refreshMembership(); if(!live||!familyId)return;
            channel=sb.channel('legacy-doc-'+collection+'-'+id+'-'+Math.random()).on('postgres_changes',{event:'*',schema:'public',table:collection==='family'?'legacy_families':'legacy_documents'},load).subscribe();
          })();
          return ()=>{live=false;if(channel)sb.removeChannel(channel)};
        }
      };
    },
    collection(name) {
      return {
        get:async()=>{await refreshMembership();if(!familyId)return {docs:[]};const {data,error}=await sb.from('legacy_documents').select('doc_id,data').eq('family_id',familyId).eq('collection_name',name);if(error)fail(error);return {docs:(data||[]).map(r=>snapDoc(r.doc_id,r.data))};},
        onSnapshot:(next,error)=>{
          let live=true, channel=null, prev=new Map();
          const load=async(initial=false)=>{try{await refreshMembership();if(!familyId)return;const {data,error:e}=await sb.from('legacy_documents').select('doc_id,data').eq('family_id',familyId).eq('collection_name',name);if(e)fail(e);const rows=data||[];const snap=querySnap(rows,prev);prev=new Map(rows.map(r=>[r.doc_id,r.data]));if(live)next(snap);}catch(e){if(error)error(e)}};
          load(true);
          (async()=>{await refreshMembership();if(!live||!familyId)return;channel=sb.channel('legacy-collection-'+name+'-'+Math.random()).on('postgres_changes',{event:'*',schema:'public',table:'legacy_documents',filter:`family_id=eq.${familyId}`},()=>load()).subscribe();})();
          return ()=>{live=false;if(channel)sb.removeChannel(channel)};
        }
      };
    }
  };
  const userApi = {
    me:async()=>{const {data:{user:u}}=await sb.auth.getUser();return u?{id:u.id,email:u.email,name:u.user_metadata?.full_name||u.email}:null;},
    isOwner:async()=>{await refreshMembership();return !familyId||familyRole==='owner';},
    canEdit:async()=>{await refreshMembership();return !familyId||['owner','admin','editor'].includes(familyRole);},
    can:async()=>{await refreshMembership();return !familyId||['owner','admin','editor'].includes(familyRole);},
    profiles:async(ids)=>{const out={};for(const id of ids){if(id===user?.id)out[id]={name:user.user_metadata?.full_name||user.email,isMe:true};}return out;}
  };
  const downloads={save:async({filename,data})=>{const blob=data instanceof Blob?data:new Blob([data]);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}};
  window.claude={use:async(name)=>{await refreshMembership();if(name==='db')return db;if(name==='user')return userApi;if(name==='downloads')return downloads;return null;}};
  // Auth changes refresh family access and notify original document watchers.
  sb.auth.onAuthStateChange(()=>{refreshMembership().then(()=>{for(const f of window.__legacyRefreshers||[])f();});});
  window.__legacyRefreshers=[];
  window.__legacyBridgeReady=true;
})();
