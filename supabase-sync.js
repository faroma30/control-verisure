(()=>{
  const URL='https://lbybhaopzojfobpkrgyh.supabase.co';
  const KEY='sb_publishable_mikC3m9buFL5qcfNZoDuww_KYnOanHS';
  const CACHE='cvSupabaseProfile';
  const GLOBAL=['stockCounts','stockCountHistory','catalogChanges','referidosPagos','closureInputs','overtimeRecords','closureNames'];
  if(!window.supabase?.createClient)return;
  const db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  window.controlVerisureSupabase=db;
  let authUser=null,profile=null,timer=0,applying=false,pendingPasswordUser=null,dirty=false,changeVersion=0,remoteUpdatedAt='';
  const managed=(key,user)=>key===`controlRecords_${user}`||key===`closureDays_${user}`||key===`closureHistory_${user}`||GLOBAL.includes(key);
  const snap=user=>{const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(managed(k,user))out[k]=localStorage.getItem(k);}return out;};
  const clear=user=>[...GLOBAL,`controlRecords_${user}`,`closureDays_${user}`,`closureHistory_${user}`].forEach(k=>localStorage.removeItem(k));
  function apply(user,data){applying=true;clear(user);Object.entries(data||{}).forEach(([k,v])=>{if(managed(k,user)&&v!==null)localStorage.setItem(k,String(v));});applying=false;}
  async function save(){
    if(!authUser||!profile||applying)return;
    const version=changeVersion,updatedAt=new Date().toISOString(),payload=snap(profile.username);
    const {error}=await db.from('user_data').upsert({user_id:authUser.id,data:payload,updated_at:updatedAt});
    if(error){console.error(error);dirty=true;return;}
    remoteUpdatedAt=updatedAt;
    if(version===changeVersion)dirty=false;else queue();
  }
  function queue(){if(applying||!authUser||!profile)return;dirty=true;changeVersion++;clearTimeout(timer);timer=setTimeout(save,60);}
  const nativeSet=Storage.prototype.setItem,nativeRemove=Storage.prototype.removeItem;
  Storage.prototype.setItem=function(k,v){nativeSet.call(this,k,v);if(this===localStorage&&profile&&managed(k,profile.username))queue();};
  Storage.prototype.removeItem=function(k){nativeRemove.call(this,k);if(this===localStorage&&profile&&managed(k,profile.username))queue();};
  async function getProfile(user){const {data,error}=await db.from('profiles').select('id,username,role,must_change_password').eq('id',user.id).single();if(error)throw error;return data;}
  async function activate(user,p,afterLogin=false){
    authUser=user;profile=p;
    localStorage.setItem(CACHE,JSON.stringify({username:p.username,role:p.role}));
    localStorage.setItem('verisureCurrentUser',p.username);localStorage.setItem('verisureCurrentRole',p.role);
    const {data,error}=await db.from('user_data').select('data,updated_at').eq('user_id',user.id).single();if(error)throw error;
    remoteUpdatedAt=data?.updated_at||'';
    const remote=data?.data||{};
    if(Object.keys(remote).length){const before=JSON.stringify(snap(p.username));apply(p.username,remote);if(!afterLogin&&before!==JSON.stringify(remote)&&!sessionStorage.getItem('cvCloudReload')){sessionStorage.setItem('cvCloudReload','1');location.reload();return;}}
    else{if(p.username!=='Q04780')clear(p.username);await save();}
    sessionStorage.removeItem('cvCloudReload');
  }
  async function pull(){
    if(!authUser||!profile||dirty||applying)return;
    const {data,error}=await db.from('user_data').select('data,updated_at').eq('user_id',authUser.id).single();
    if(error){console.error(error);return;}
    if(!data?.updated_at||data.updated_at===remoteUpdatedAt)return;
    remoteUpdatedAt=data.updated_at;
    const remote=data.data||{};
    if(JSON.stringify(snap(profile.username))!==JSON.stringify(remote)){apply(profile.username,remote);location.reload();}
  }
  function ensureGate(){
    let g=document.getElementById('loginGate');
    if(!g){g=document.createElement('div');g.id='loginGate';g.className='login-gate';g.style.display='none';g.innerHTML='<div class="login-card"><h1>Control Verisure</h1><p id="loginHint">Accede con tu usuario</p><form id="loginForm"><label>Usuario<input id="loginUser" autocomplete="username" required></label><label>Contraseña<input id="loginPass" type="password" autocomplete="current-password" required></label><label class="remember"><input id="rememberLogin" type="checkbox"> Recordar usuario</label><label id="newPassWrap" hidden>Nueva contraseña<input id="newPass" type="password" minlength="6" autocomplete="new-password"></label><button class="primary" id="loginSubmit">Entrar</button><p id="loginError" class="login-error"></p></form></div>';document.body.appendChild(g);}
    return g;
  }
  ensureGate();
  const gate=()=>{const g=ensureGate();g.style.display='grid';document.body.appendChild(g);};
  const error=text=>{const e=document.getElementById('loginError');if(e)e.textContent=text;};
  const form=document.getElementById('loginForm');
  if(form)form.addEventListener('submit',async e=>{
    e.preventDefault();e.stopImmediatePropagation();error('');
    const username=document.getElementById('loginUser').value.trim().toUpperCase();
    const password=document.getElementById('loginPass').value;
    const next=document.getElementById('newPass').value;
    const button=document.getElementById('loginSubmit');button.disabled=true;
    try{
      if(pendingPasswordUser){
        if(next.length<6)throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
        const {error:e1}=await db.auth.updateUser({password:next});if(e1)throw e1;
        const {error:e2}=await db.from('profiles').update({must_change_password:false}).eq('id',pendingPasswordUser.id);if(e2)throw e2;
        profile.must_change_password=false;await activate(pendingPasswordUser,profile,true);location.reload();return;
      }
      const {data,error:loginError}=await db.auth.signInWithPassword({email:username.toLowerCase()+'@control-verisure.local',password});
      if(loginError)throw new Error('Usuario o contraseña incorrectos.');
      const p=await getProfile(data.user);
      if(document.getElementById('rememberLogin').checked)localStorage.setItem('verisureRememberLogin',JSON.stringify({user:username}));else localStorage.removeItem('verisureRememberLogin');
      if(p.must_change_password){pendingPasswordUser=data.user;authUser=data.user;profile=p;document.getElementById('newPassWrap').hidden=false;document.getElementById('newPass').required=true;document.getElementById('loginHint').textContent='Debes cambiar la contraseña para continuar.';document.getElementById('loginUser').disabled=true;document.getElementById('loginPass').disabled=true;button.textContent='Guardar contraseña';}
      else{await activate(data.user,p,true);location.reload();}
    }catch(ex){error(ex.message||'No se ha podido iniciar sesión.');}finally{button.disabled=false;}
  },true);
  async function boot(){
    const remembered=JSON.parse(localStorage.getItem('verisureRememberLogin')||'null');if(remembered?.user){document.getElementById('loginUser').value=remembered.user;document.getElementById('rememberLogin').checked=true;}
    const {data:{session}}=await db.auth.getSession();
    if(!session){localStorage.removeItem(CACHE);localStorage.removeItem('verisureCurrentUser');localStorage.removeItem('verisureCurrentRole');gate();return;}
    try{const p=await getProfile(session.user);if(p.must_change_password){await db.auth.signOut();localStorage.removeItem(CACHE);localStorage.removeItem('verisureCurrentUser');localStorage.removeItem('verisureCurrentRole');gate();return;}await activate(session.user,p);}catch(ex){console.error(ex);gate();}
  }
  boot();
  const logout=document.getElementById('logoutBtn');if(logout)logout.onclick=async()=>{await save();await db.auth.signOut();localStorage.removeItem(CACHE);localStorage.removeItem('verisureCurrentUser');localStorage.removeItem('verisureCurrentRole');location.reload();};
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();else pull();});
  window.addEventListener('focus',pull);
  window.addEventListener('pagehide',save);
  setInterval(pull,15000);
  window.controlVerisureSyncNow=async()=>{await save();await pull();};
  async function drawUsers(){
    const list=document.getElementById('userList');if(!list||profile?.role!=='MASTER')return;
    const {data,error:e}=await db.from('profiles').select('username,role').order('username');if(e){list.textContent='No se pudieron cargar los usuarios.';return;}
    list.innerHTML=data.map(x=>'<div class="user-row"><span><strong>'+x.username+'</strong> · '+x.role+'</span>'+(x.username==='Q04780'?'':'<button type="button" class="secondary" data-cloud-delete="'+x.username+'">Borrar</button>')+'</div>').join('');
    list.querySelectorAll('[data-cloud-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Borrar el usuario '+b.dataset.cloudDelete+'?'))return;const {error}=await db.functions.invoke('manage-users',{body:{action:'delete',username:b.dataset.cloudDelete}});if(error)alert('No se pudo borrar el usuario.');else drawUsers();});
  }
  setTimeout(()=>{
    const cached=JSON.parse(localStorage.getItem(CACHE)||'null');const users=[...document.querySelectorAll('#nav button')].find(x=>x.textContent.trim()==='Usuarios');const dialog=document.getElementById('userAdmin');
    if(users&&dialog&&cached?.role==='MASTER')users.onclick=e=>{e.preventDefault();drawUsers();dialog.showModal();};
    const add=document.getElementById('addUserBtn');if(add)add.onclick=async()=>{const username=document.getElementById('newUserName').value.trim().toUpperCase(),password=document.getElementById('newUserPass').value;if(!username||password.length<6)return alert('Introduce usuario y una contraseña de al menos 6 caracteres.');add.disabled=true;const {error}=await db.functions.invoke('manage-users',{body:{action:'create',username,password}});add.disabled=false;if(error)return alert('No se pudo crear el usuario.');document.getElementById('newUserName').value='';document.getElementById('newUserPass').value='';drawUsers();};
  },700);
})();
