  <script>
    const API = 'https:roomiematch-production-d1bb.up.railway.app';
    let currentStep = 1;
    let currentUserId = localStorage.getItem("roomie_user_id") ? parseInt(localStorage.getItem("roomie_user_id")) : null;
    let isAdmin = localStorage.getItem("roomie_is_admin") === "true";
    let chatPartnerId = null;
    let chatPollTimer = null;
    let lastChatTimestamp = null;

    const avatarColors = [
      'linear-gradient(135deg,#c8603a,#e07a54)',
      'linear-gradient(135deg,#7a9e7e,#a8c5ac)',
      'linear-gradient(135deg,#5b7fa6,#87aed4)',
      'linear-gradient(135deg,#9b6b9e,#c49dc7)',
      'linear-gradient(135deg,#c0923e,#ddb96b)',
    ];
    function getAvatarColor(i){ return avatarColors[i % avatarColors.length]; }
    function getInitials(name){
      if(!name) return '?';
      return name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    }
    function escHtml(str){
      if(str==null) return '';
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function showToast(msg,type=''){
      const el=document.getElementById('toast');
      el.textContent=msg; el.className='toast '+type;
      el.classList.add('show');
      setTimeout(()=>el.classList.remove('show'),3500);
    }
    function updateSleepLabel(val){
      const h = parseInt(val);
      document.getElementById('sleep-val').textContent = h > 24 ? (h-24)+':00 AM' : h+':00';
    }

    /* ── NAV STATE ── */
    function updateNav(){
      const loggedIn = !!currentUserId;
      document.getElementById('nav-create-btn').style.display  = (!loggedIn && !isAdmin) ? '' : 'none';
      document.getElementById('nav-login-btn').style.display    = (!loggedIn && !isAdmin) ? '' : 'none';
      document.getElementById('nav-admin-login-btn').style.display  = (!isAdmin) ? '' : 'none';
      document.getElementById('nav-profile-btn').style.display      = (loggedIn && !isAdmin) ? '' : 'none';
      document.getElementById('nav-matches-btn').style.display      = (loggedIn && !isAdmin) ? '' : 'none';
      document.getElementById('nav-messages-btn').style.display     = (loggedIn && !isAdmin) ? '' : 'none';
      document.getElementById('nav-browse-btn').style.display       = isAdmin ? '' : 'none';
      document.getElementById('nav-admin-btn').style.display        = isAdmin ? '' : 'none';
      document.getElementById('nav-logout-btn').style.display       = (loggedIn || isAdmin) ? '' : 'none';
    }

    /* ── VIEW ROUTING ── */
    function showView(name){
      // guards
      if((name==='admin-panel') && !isAdmin){ showToast('Admin access only','error'); return; }
      if((name==='profile'||name==='matches'||name==='messages') && !currentUserId && !isAdmin){
        showToast('Please create a profile first','error'); showView('create'); return;
      }
      // stop chat polling when leaving chat
      if(name !== 'chat') stopChatPoll();

      document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
      const target = document.getElementById('view-'+name);
      if(target) target.classList.add('active');

      if(name==='admin-panel')   loadAdminUsers();
      if(name==='profile')       loadMyProfile();
      if(name==='matches')       loadMatches();
      if(name==='messages')      loadConversations();
      if(name==='create')        initCreateForm();
      window.scrollTo({top:0,behavior:'smooth'});
    }

    function logout(){
      currentUserId=null; isAdmin=false;
      localStorage.removeItem("roomie_user_id");
      localStorage.removeItem("roomie_is_admin");
      stopChatPoll();
      updateNav(); showView('home');
      showToast('Logged out successfully','success');
    }

    /* ── USER LOGIN ── */
    async function userLogin(){
      const email=document.getElementById('login-email').value.trim();
      if(!email){ showToast('Please enter your email','error'); return; }
      try{
        const res=await fetch(API+'/login',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({email})
        });
        const data=await res.json();
        if(!res.ok){ showToast(data.detail||'No account found. Create a profile first.','error'); return; }
        currentUserId=data.id;
        localStorage.setItem('roomie_user_id',currentUserId);
        updateNav(); showToast('Welcome back, '+data.name+'! 👋','success');
        showView('profile');
      } catch{ showToast('Cannot connect to server','error'); }
    }

        /* ── ADMIN LOGIN ── */
    async function adminLogin(){
      const username=document.getElementById('admin-username').value.trim();
      const password=document.getElementById('admin-password').value.trim();
      if(!username||!password){ showToast('Please enter username and password','error'); return; }
      try{
        const res=await fetch(API+'/admin/login',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({username,password})
        });
        if(!res.ok){ const err=await res.json(); showToast(err.detail||'Invalid credentials','error'); return; }
        isAdmin=true;
        localStorage.setItem("roomie_is_admin","true");
        updateNav(); showToast('Welcome, Admin! 👋','success');
        showView('admin-panel');
      } catch{ showToast('Cannot connect to server','error'); }
    }

    /* ── MY PROFILE ── */
    async function loadMyProfile(){
      const container=document.getElementById('profile-container');
      container.innerHTML='<div class="spinner"></div>';
      try{
        const res=await fetch(API+'/users');
        const users=await res.json();
        const me=users.find(u=>u.id===currentUserId);
        if(!me){ container.innerHTML=emptyState('Profile not found','Try creating a new profile'); return; }
        container.innerHTML=`
          <div class="profile-card fade-in">
            <div class="profile-card-header">
              <div class="profile-avatar-big" style="background:${getAvatarColor(0)}">${getInitials(me.name)}</div>
              <div>
                <div class="profile-name">${escHtml(me.name)}</div>
                <div class="profile-meta">📍 ${escHtml(me.city)} &bull; Age ${me.age}</div>
              </div>
            </div>
            <div class="profile-details">
              <div class="profile-detail">
                <span class="profile-detail-key">Budget</span>
                <span class="profile-detail-val">${(me.budget||0).toLocaleString()} ILS/month</span>
              </div>
              <div class="profile-detail">
                <span class="profile-detail-key">Email</span>
                <span class="profile-detail-val">${escHtml(me.email)}</span>
              </div>
            </div>
            <div class="profile-actions">
              <button class="btn-matches" onclick="showView('matches')">🔍 See My Matches</button>
              <button class="btn-edit" onclick="startEditProfile(${me.id})">✏️ Edit Profile</button>
              <button class="btn-delete" onclick="deleteMyProfile(${me.id})">🗑️ Delete Account</button>
            </div>
          </div>`;
      } catch{ container.innerHTML=emptyState('Could not load profile','Make sure the server is running'); }
    }

    async function deleteMyProfile(userId){
      if(!confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
      try{
        const res=await fetch(API+'/user/'+userId,{method:'DELETE'});
        const data=await res.json();
        if(data.error){ showToast(data.error,'error'); return; }
        currentUserId=null; localStorage.removeItem("roomie_user_id");
        updateNav(); showToast('Account deleted','success'); showView('home');
      } catch{ showToast('Error deleting account','error'); }
    }

    /* ── ADMIN USERS ── */
    async function loadAdminUsers(){
      const container=document.getElementById('admin-users-container');
      if(!container) return;
      container.innerHTML='<div class="spinner"></div>';
      try{
        const res=await fetch(API+'/users');
        const users=await res.json();
        if(!users.length){ container.innerHTML=emptyState('No profiles yet','No users registered'); return; }
        container.innerHTML='';
        const list=document.createElement('div');
        list.className='users-list';
        users.forEach((user,i)=>{
          const row=document.createElement('div');
          row.className='user-row fade-in';
          row.style.animationDelay=(i*0.07)+'s';
          row.innerHTML=`
            <div class="user-row-avatar" style="background:${getAvatarColor(i)}">${getInitials(user.name)}</div>
            <div class="user-row-info">
              <div class="user-row-name">${escHtml(user.name)}, ${user.age}</div>
              <div class="user-row-meta">${escHtml(user.city)} &bull; ${escHtml(user.email)} &bull; Budget: ${(user.budget||0).toLocaleString()} ILS</div>
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
              <button class="user-row-action" onclick="findMatchesFor(${user.id})">Matches</button>
              <button class="user-row-action" style="background:var(--sage-pale);color:var(--sage);" onclick="startEditProfile(${user.id})">Edit</button>
              <button class="user-row-action" style="background:#fde8e8;color:#c0392b;" onclick="adminDeleteUser(${user.id})">Delete</button>
            </div>`;
          list.appendChild(row);
        });
        container.appendChild(list);
      } catch{ container.innerHTML=emptyState('Backend unreachable','Make sure the server is running'); }
    }

    async function adminDeleteUser(userId){
      if(!confirm('Delete this user?')) return;
      try{
        const res=await fetch(API+'/user/'+userId,{method:'DELETE'});
        const data=await res.json();
        if(data.error){ showToast(data.error,'error'); return; }
        showToast('User deleted','success'); loadAdminUsers();
      } catch{ showToast('Error','error'); }
    }

    /* ── CREATE / EDIT FORM ── */
    function initCreateForm(){
      // Only reset if NOT pre-filled by startEditProfile
      if(!document.getElementById('edit-user-id').value){
        document.getElementById('profile-form').reset();
        document.getElementById('form-title').innerHTML = 'Build your <em>profile</em>';
        document.getElementById('form-submit-btn').textContent = 'Create Profile';
        updateSleepLabel(23);
      }
      currentStep=1; updateStepUI(1);
    }

    async function startEditProfile(userId){
      // Fetch users and pre-fill the form
      try{
        const res=await fetch(API+'/users');
        const users=await res.json();
        const user=users.find(u=>u.id===userId);
        if(!user){ showToast('User not found','error'); return; }

        document.getElementById('edit-user-id').value=userId;
        document.getElementById('f-name').value=user.name||'';
        document.getElementById('f-email').value=user.email||'';
        document.getElementById('f-age').value=user.age||'';
        document.getElementById('f-city').value=user.city||'';
        document.getElementById('f-budget').value=user.budget||'';

        document.getElementById('form-title').innerHTML = 'Edit your <em>profile</em>';
        document.getElementById('form-submit-btn').textContent = 'Save Changes';
        showView('create');
      } catch{ showToast('Could not load user data','error'); }
    }

    function resetForm(){
      document.getElementById('edit-user-id').value='';
      document.getElementById('profile-form').reset();
      document.getElementById('form-title').innerHTML='Build your <em>profile</em>';
      document.getElementById('form-submit-btn').textContent='Create Profile';
      updateSleepLabel(23);
      currentStep=1; updateStepUI(1);
    }

    function nextStep(step){
      if(step>currentStep && !validateStep(currentStep)) return;
      currentStep=step; updateStepUI(step);
    }

    function validateStep(step){
      if(step===1){
        const name=document.getElementById('f-name').value.trim();
        const age=parseInt(document.getElementById('f-age').value);
        const city=document.getElementById('f-city').value.trim();
        const budget=document.getElementById('f-budget').value;
        const gender=document.getElementById('f-gender').value;
        const email=document.getElementById('f-email').value.trim();
        if(!name||!age||!city||!budget||!gender||!email){ showToast('Please fill in all required fields','error'); return false; }
        if(age<18||age>80){ showToast('Age must be between 18 and 80','error'); return false; }
        if(parseInt(budget)<500){ showToast('Budget must be at least 500 ILS','error'); return false; }
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showToast('Please enter a valid email','error'); return false; }
        if(name.length<2){ showToast('Name must be at least 2 characters','error'); return false; }
      }
      return true;
    }

    function updateStepUI(step){
      document.querySelectorAll('.form-panel').forEach(p=>p.classList.remove('active'));
      document.getElementById('panel-'+step).classList.add('active');
      for(let i=1;i<=3;i++){
        const ind=document.getElementById('step-ind-'+i);
        ind.className='step-item';
        if(i<step) ind.classList.add('done');
        else if(i===step) ind.classList.add('active');
      }
      document.getElementById('form-eyebrow').textContent='Step '+step+' of 3';
    }

    /* ── FORM SUBMIT: handles both CREATE and UPDATE ── */
    document.getElementById('profile-form').addEventListener('submit',async(e)=>{
      e.preventDefault();
      const editId=document.getElementById('edit-user-id').value;
      const isEdit=!!editId;

      const interests=Array.from(document.querySelectorAll('input[name="interests"]:checked')).map(el=>el.value);
      const petsVal=document.querySelector('input[name="pets"]:checked');
      const neatVal=document.querySelector('input[name="neat"]:checked');
      const prefGender=document.querySelector('input[name="pref-gender"]:checked');

      // PUT /user/{id} — backend accepts same UserCreate schema
      const payload={
        name: document.getElementById('f-name').value.trim(),
        email: document.getElementById('f-email').value.trim(),
        age: parseInt(document.getElementById('f-age').value),
        city: document.getElementById('f-city').value.trim(),
        budget: parseInt(document.getElementById('f-budget').value),
        gender: document.getElementById('f-gender').value,
        sleep_time: parseInt(document.getElementById('f-sleep').value),
        cleanliness: neatVal ? neatVal.value : 'moderately_neat',
        pets: petsVal ? parseFloat(petsVal.value) : 0,
        interests,
        preferred_gender: prefGender ? prefGender.value : 'any',
        bio: document.getElementById('f-bio').value.trim(),
      };

      const btn=e.target.querySelector('.btn-submit');
      btn.textContent=isEdit?'Saving…':'Creating…'; btn.disabled=true;
      try{
        let res, data;
        if(isEdit){
          // PUT /user/{id}
          res=await fetch(API+'/user/'+editId,{
            method:'PUT', headers:{'Content-Type':'application/json'},
            body:JSON.stringify(payload)
          });
          data=await res.json();
          if(!res.ok||data.error){ showToast(data.error||data.detail||'Update failed','error'); return; }
          // keep currentUserId if editing own profile
          if(parseInt(editId)===currentUserId || !currentUserId){
            currentUserId=parseInt(editId);
            localStorage.setItem("roomie_user_id",currentUserId);
          }
          showToast('Profile updated! ✅','success');
        } else {
          // POST /user
          res=await fetch(API+'/user',{
            method:'POST', headers:{'Content-Type':'application/json'},
            body:JSON.stringify(payload)
          });
          data=await res.json();
          if(!res.ok){ showToast(data.detail||'An error occurred','error'); return; }
          currentUserId=data.id;
          localStorage.setItem("roomie_user_id",currentUserId);
          showToast('Profile created successfully! 🎉','success');
        }
        updateNav();
        document.getElementById('edit-user-id').value='';
        e.target.reset(); resetForm();
        setTimeout(()=>showView('profile'),1200);
      } catch(err){
        showToast('Could not connect to backend: '+err.message,'error');
      } finally{
        btn.textContent=isEdit?'Save Changes':'Create Profile'; btn.disabled=false;
      }
    });

    /* ── MATCHES ── */
    async function loadMatches(){
      if(!currentUserId){ showToast('Create a profile first','error'); return; }
      await fetchMatches(currentUserId);
    }

    async function findMatchesFor(userId){
      showView('matches');
      await fetchMatches(userId);
    }

    async function fetchMatches(userId){
      const container=document.getElementById('matches-container');
      container.innerHTML='<div class="spinner"></div>';
      try{
        const res=await fetch(API+'/matches/'+userId);
        if(!res.ok) throw new Error('Status '+res.status);
        const matches=await res.json();
        if(matches.error){ container.innerHTML=emptyState('Error',''+matches.error); return; }
        if(!matches.length){ container.innerHTML=emptyState('No matches found','Try adding more profiles in the same city'); return; }

        container.innerHTML='';
        const grid=document.createElement('div');
        grid.className='matches-grid';

        matches.forEach((match,i)=>{
          const score=match.score??0;
          const pct=Math.round(score*100);
          const card=document.createElement('div');
          card.className='match-card fade-in';
          card.style.animationDelay=(i*0.1)+'s';

          // mailto link
          const subject=encodeURIComponent('Hi from RoomieMatch! 🏠');
          const body=encodeURIComponent(`Hey ${match.name},\n\nI found your profile on RoomieMatch and think we could be a great match!\n\nWould love to chat more about potentially being roommates.\n\nBest,`);
          const mailtoLink=`mailto:${match.email}?subject=${subject}&body=${body}`;

          // Only show chat button for regular (non-admin) logged-in user
          const chatBtnHtml=(!isAdmin && currentUserId && currentUserId!==match.id)
            ? `<button class="chat-btn" onclick="openChat(${match.id},'${escHtml(match.name)}','${escHtml(match.city)}')">💬 Chat</button>`
            : '';

          card.innerHTML=`
            <div class="match-card-avatar" style="background:${getAvatarColor(i)}">${getInitials(match.name)}</div>
            <div class="match-card-name">${escHtml(match.name)}, ${match.age}</div>
            <div class="match-card-location">📍 ${escHtml(match.city)}</div>
            <div class="match-score-row">
              <span class="match-score-label">Compatibility</span>
              <span class="match-score-pct">${pct}%</span>
            </div>
            <div class="score-bar-track">
              <div class="score-bar-fill" style="width:0%" data-target="${pct}"></div>
            </div>
            <div class="match-details">
              <div class="match-detail-item"><span class="detail-key">Budget</span><span class="detail-val">${(match.budget||0).toLocaleString()} ILS</span></div>
              <div class="match-detail-item"><span class="detail-key">City</span><span class="detail-val">${escHtml(match.city)}</span></div>
            </div>
            <div class="match-card-actions">
             ${chatBtnHtml}
            </div>`;
          grid.appendChild(card);
        });
        container.appendChild(grid);
        setTimeout(()=>container.querySelectorAll('.score-bar-fill').forEach(b=>b.style.width=b.dataset.target+'%'),200);
      } catch{
        container.innerHTML=emptyState('Could not load matches','Ensure the server is running');
      }
    }

    /* ── CONVERSATIONS ── */
    async function loadConversations(){
      if(!currentUserId) return;
      const container=document.getElementById('conversations-container');
      container.innerHTML='<div class="spinner"></div>';
      try{
        const res=await fetch(API+'/conversations/'+currentUserId);
        const convs=await res.json();
        if(!convs.length){
          container.innerHTML=emptyState('No conversations yet','Start chatting from your Matches page');
          return;
        }
        container.innerHTML='';
        const list=document.createElement('div');
        list.className='conversations-list';
        convs.forEach((conv,i)=>{
          const item=document.createElement('div');
          item.className='conv-item fade-in';
          item.style.animationDelay=(i*0.07)+'s';
          item.innerHTML=`
            <div class="conv-avatar" style="background:${getAvatarColor(i)}">${getInitials(conv.name)}</div>
            <div>
              <div class="conv-name">${escHtml(conv.name)}</div>
              <div class="conv-city">📍 ${escHtml(conv.city)}</div>
            </div>`;
          item.onclick=()=>openChat(conv.id, conv.name, conv.city);
          list.appendChild(item);
        });
        container.appendChild(list);
      } catch{
        container.innerHTML=emptyState('Could not load conversations','Make sure the server is running');
      }
    }

    /* ── CHAT ── */
    function openChat(partnerId, partnerName, partnerCity){
      chatPartnerId=partnerId;
      stopChatPoll();
      showView('chat');

      // header
      const idx = parseInt(partnerId) % avatarColors.length;
      document.getElementById('chat-header-area').innerHTML=`
        <div class="chat-header">
          <div class="chat-avatar" style="background:${getAvatarColor(idx)}">${getInitials(partnerName)}</div>
          <div>
            <div class="chat-partner-name">${escHtml(partnerName)}</div>
            <div class="chat-partner-city">📍 ${escHtml(partnerCity)}</div>
          </div>
        </div>`;

      document.getElementById('chat-messages-area').innerHTML='<div class="chat-empty">Loading messages…</div>';
      loadChatMessages();
      // poll every 3 seconds for new messages
      chatPollTimer=setInterval(loadChatMessages,3000);
    }

    async function loadChatMessages(){
      if(!currentUserId||!chatPartnerId) return;
      try{
        const res=await fetch(API+'/messages/'+currentUserId+'/'+chatPartnerId);
        if(!res.ok) return;
        const msgs=await res.json();
        const area=document.getElementById('chat-messages-area');
        if(!area) return;

        const wasAtBottom=area.scrollHeight-area.clientHeight<=area.scrollTop+40;

        if(!msgs.length){
          area.innerHTML='<div class="chat-empty">No messages yet. Say hello! 👋</div>';
          return;
        }
        area.innerHTML='';
        msgs.forEach(m=>{
          const isMine=m.sender_id===currentUserId;
          const bubble=document.createElement('div');
          bubble.className='chat-bubble '+(isMine?'mine':'theirs');
          const time=m.timestamp ? new Date(m.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '';
          bubble.innerHTML=`${escHtml(m.message)}<div class="bubble-time">${time}</div>`;
          area.appendChild(bubble);
        });
        if(wasAtBottom) area.scrollTop=area.scrollHeight;
      } catch{ /* silent — just polling */ }
    }

    async function sendChatMessage(){
      const input=document.getElementById('chat-input');
      const text=input.value.trim();
      if(!text||!currentUserId||!chatPartnerId) return;
      input.value='';
      try{
        await fetch(API+'/messages',{
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({sender_id:currentUserId, receiver_id:chatPartnerId, message:text})
        });
        await loadChatMessages();
        const area=document.getElementById('chat-messages-area');
        if(area) area.scrollTop=area.scrollHeight;
      } catch{ showToast('Could not send message','error'); }
    }

    function stopChatPoll(){
      if(chatPollTimer){ clearInterval(chatPollTimer); chatPollTimer=null; }
    }

    /* ── HELPERS ── */
    function emptyState(title,sub){
      return `<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div><p class="empty-title">${escHtml(title)}</p><p class="empty-sub">${escHtml(sub)}</p></div>`;
    }

    function animateCount(el,target){
      let current=0; const step=Math.ceil(target/40);
      const timer=setInterval(()=>{ current=Math.min(current+step,target); el.textContent=current; if(current>=target) clearInterval(timer); },40);
    }

    /* ── INIT ── */
    updateNav();
    fetch(API+'/users').then(r=>r.json()).then(users=>{
      const el=document.getElementById('stat-users');
      if(el) animateCount(el,users.length);
    }).catch(()=>{});
  </script>
