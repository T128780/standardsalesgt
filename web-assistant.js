(function () {
  'use strict';
  const CONFIG = Object.freeze({ mode: 'backend-with-fallback', backendEnabled: true, backendAction: 'assistant_web_chat', publicWhatsApp: '50255212375' });
  const state = { role: '', messages: [] };
  const suggestions = ['Busco un repuesto','Quiero vender repuestos','¿Cómo funciona?','Hablar con una persona'];
  const PART_RULES = [
    { match:/sensor de oxigeno|sensor maf|sensor map|sensor tps|sensor ckp|sensor cmp|ecu|computadora|arnes|fusible|rele|switch|bobina|alternador/, category:'Eléctrico', reason:'Es un componente eléctrico o electrónico que envía, recibe o gestiona información del vehículo.' },
    { match:/motor completo|culata|piston|ciguenal|block|bomba de agua|radiador|termostato/, category:'Motor', reason:'Forma parte del motor o de sus sistemas principales de funcionamiento y enfriamiento.' },
    { match:/caja|transmision|clutch|flecha|punta de flecha/, category:'Piezas mecánicas', reason:'Forma parte del sistema mecánico de transmisión del vehículo.' },
    { match:/amortiguador|shock|resorte|muleta|rotula|terminal|cremallera/, category:'Suspensión', reason:'Corresponde al sistema de suspensión o dirección del vehículo.' },
    { match:/bumper|lodera|capo|puerta|baul|retrovisor|silvin|stop/, category:'Carrocería', reason:'Es una pieza exterior de carrocería, iluminación o acabado del vehículo.' }
  ];
  const BRANDS = ['Toyota','Nissan','Mitsubishi','Honda','Mazda','Hyundai','Kia','Ford','Chevrolet','Suzuki','Isuzu'];
  const MODELS = ['Mirage','Yaris','Corolla','Hilux','Rogue','Frontier','Sentra','Civic','CR-V','Mazda 2','Mazda 3'];
  const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const formatPhone = value => { const d=String(value||'').replace(/\D/g,''); return d.length===11 ? `+${d.slice(0,3)} ${d.slice(3,7)} ${d.slice(7)}` : `+${d}`; };

  function classify(text) {
    const value=normalize(text);
    if (/persona|humano|asesor|contacto|whatsapp|telefono|hablar|alguien/.test(value)) return 'human';
    if (/cuanto|costo|precio.*inscri|membres|plan/.test(value)) return 'membership';
    if (/como funciona|que es standard|plataforma/.test(value)) return 'about';
    if (/donde.*registro|registrarme|inscribirme/.test(value)) return state.role==='buyer'?'buyer':'seller';
    if (/vender|vendedor|vendo|repuestos de|manejo repuestos/.test(value)) return 'seller';
    if (/busco|necesito|comprador|repuesto|bumper|retrovisor|motor|pieza/.test(value)) return 'buyer';
    return 'unknown';
  }

  function titleCase(value) { return value ? value.charAt(0).toUpperCase()+value.slice(1) : ''; }
  function findNamed(text,list) { const n=normalize(text); return list.find(item=>n.includes(normalize(item)))||''; }
  function extractBuyerData(text) {
    const value=normalize(text);
    const rule=PART_RULES.find(item=>item.match.test(value));
    const year=(value.match(/\b(19|20)\d{2}\b/)||[])[0]||'';
    const condition=(value.match(/\b(nueva|nuevo|usada|usado|reconstruida|reconstruido)\b/)||[])[0]||'';
    const piecePatterns=[['sensor de oxigeno','Sensor de oxígeno'],['bumper','Bumper'],['amortiguador','Amortiguador'],['caja','Caja / transmisión'],['retrovisor','Retrovisor'],['stop','Stop'],['lodera','Lodera']];
    const piece=(piecePatterns.find(item=>value.includes(item[0]))||[])[1]||'';
    return {brand:findNamed(text,BRANDS),model:findNamed(text,MODELS),year,piece,condition:titleCase(condition),category:rule?.category||'Otro',reason:rule?.reason||'No hay una coincidencia segura; podés usar “Otro” y describir claramente la pieza.'};
  }
  function buyerReply(text) {
    const data=extractBuyerData(text);
    if(!data.piece) return 'Con gusto te ayudamos. Indicá la pieza, marca, línea o modelo y año. También necesitaremos condición, departamento y WhatsApp para completar la solicitud gratuita.';
    const oxygen=normalize(data.piece).includes('sensor de oxigeno');
    const reason=oxygen?'El sensor envía información a la computadora para regular la mezcla de aire y combustible. Aunque se relaciona con motor y escape, en el formulario conviene colocarlo como Eléctrico.':data.reason;
    return `La categoría recomendada es ${data.category}. ${reason}\n\nDatos para el formulario:\nMarca: ${data.brand||'Pendiente de confirmar'}\nLínea/modelo: ${data.model||'Pendiente de confirmar'}\nAño: ${data.year||'Pendiente de confirmar'}\nCategoría: ${data.category}\nPieza: ${data.piece}\nCondición: ${data.condition||'nueva, usada o reconstruida, según lo que aceptés'}\nDepartamento: pendiente de indicar\n\nEnviá la solicitud y vendedores compatibles podrán contactarte si tienen disponibilidad. El chat no confirma precio ni existencia.`;
  }

  function localReply(text) {
    const intent=classify(text);
    if(intent==='buyer'){ state.role='buyer'; return {intent,text:buyerReply(text),action:{label:'Solicitar mi repuesto',page:'page-solicitud'}}; }
    if(intent==='seller'){ state.role='seller'; return {intent,text:'Standard Sales GT te conecta con compradores que ya buscan piezas específicas. Por tiempo limitado, la inscripción es gratuita; después podrás escoger entre las membresías disponibles. Registrá bien marcas, líneas o modelos, categorías, condición y cobertura.',action:{label:'Ir a Soy Vendedor',page:'page-vendedor'}}; }
    if(intent==='membership') return {intent,text:'Por tiempo limitado, la inscripción de vendedores es gratuita. Más adelante podrás escoger entre las membresías disponibles según las necesidades de tu negocio.',action:{label:'Registrarme como vendedor',page:'page-vendedor'}};
    if(intent==='about') return {intent,text:'Los compradores solicitan repuestos gratis. Los vendedores registrados reciben solicitudes compatibles y contactan directamente al comprador. Standard Sales GT conecta a ambas partes; no vende los repuestos directamente.'};
    if(intent==='human') return {intent,text:`También podés escribirnos por WhatsApp al ${formatPhone(CONFIG.publicWhatsApp)} para atención directa.`,whatsapp:true};
    return {intent:'unknown',text:'Con gusto te oriento. ¿Nos escribís como comprador buscando una pieza o como vendedor de repuestos?'};
  }

  function getSessionId() {
    try {
      let value=sessionStorage.getItem('standard_sales_assistant_session');
      if(!value){value=window.crypto?.randomUUID?.()||`web-${Date.now()}-${Math.random().toString(36).slice(2)}`;sessionStorage.setItem('standard_sales_assistant_session',value);}
      return value;
    } catch(error) { return `web-${Date.now()}`; }
  }

  function backendReply(value) {
    const actionMap={open_buyer_form:{label:'Solicitar mi repuesto',page:'page-solicitud'},open_seller_form:{label:'Ir a Soy Vendedor',page:'page-vendedor'}};
    return {intent:value.intent||'unknown',text:String(value.text||'').slice(0,700),action:actionMap[value.action],whatsapp:value.action==='open_whatsapp'};
  }

  async function callBackend(text) {
    if(!CONFIG.backendEnabled||typeof GOOGLE_SCRIPT_URL==='undefined'||!GOOGLE_SCRIPT_URL) throw new Error('BACKEND_NO_DISPONIBLE');
    const history=state.messages.slice(0,-1).slice(-6).map(item=>({role:item.author==='assistant'?'assistant':'user',content:String(item.text||'').slice(0,300)}));
    const params=new URLSearchParams({accion:CONFIG.backendAction,message:text.slice(0,500),history:JSON.stringify(history),pageContext:location.hash||'inicio',sessionId:getSessionId()});
    const controller=new AbortController();
    const timer=window.setTimeout(()=>controller.abort(),20000);
    try {
      const response=await fetch(GOOGLE_SCRIPT_URL,{method:'POST',body:params,signal:controller.signal});
      if(!response.ok) throw new Error('BACKEND_HTTP');
      const value=await response.json();
      if(!value?.ok||!value.text) throw new Error('BACKEND_INVALIDO');
      return backendReply(value);
    } finally { window.clearTimeout(timer); }
  }

  function messageMarkup(message) {
    const bot=message.author==='assistant';
    const action=message.action?`<button class="standard-assistant__inline-action" data-page="${message.action.page}">${escapeHtml(message.action.label)}</button>`:'';
    const wa=message.whatsapp?`<a class="standard-assistant__inline-action standard-assistant__whatsapp" href="https://wa.me/${CONFIG.publicWhatsApp}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>`:'';
    return `<div class="standard-assistant__row standard-assistant__row--${bot?'bot':'user'}">${bot?'<span class="standard-assistant__mini-avatar" aria-hidden="true">S</span>':''}<div class="standard-assistant__bubble">${escapeHtml(message.text)}${action}${wa}</div></div>`;
  }
  function render(root){const list=root.querySelector('.standard-assistant__messages');list.innerHTML=state.messages.map(messageMarkup).join('');list.scrollTop=list.scrollHeight;}
  function add(root,message){state.messages.push(message);render(root);}
  async function respond(root,text){
    add(root,{author:'user',text});root.querySelector('.standard-assistant__status').textContent='Preparando respuesta…';
    try { add(root,{author:'assistant',...(await callBackend(text))});root.querySelector('.standard-assistant__status').textContent=''; }
    catch(error) { add(root,{author:'assistant',...localReply(text)});root.querySelector('.standard-assistant__status').textContent=''; }
  }

  function initAssistant(){
    if(document.getElementById('standard-assistant')) return;
    state.messages=[{author:'assistant',text:'Hola, soy el asistente de Standard Sales GT. Contame qué necesitás y te orientaré.'}];
    const root=document.createElement('aside');root.id='standard-assistant';root.className='standard-assistant';
    root.innerHTML=`<section class="standard-assistant__panel" id="standard-assistant-panel" role="dialog" aria-modal="false" aria-labelledby="standard-assistant-title" hidden>
      <header class="standard-assistant__header"><div class="standard-assistant__identity"><span class="standard-assistant__avatar" aria-hidden="true">S</span><div><p class="standard-assistant__eyebrow">Asistencia en línea</p><h2 class="standard-assistant__title" id="standard-assistant-title">Asistente Standard</h2><span class="standard-assistant__presence">Disponible</span></div></div><button class="standard-assistant__close" type="button" aria-label="Cerrar asistente">×</button></header>
      <div class="standard-assistant__messages" aria-live="polite"></div>
      <div class="standard-assistant__suggestions">${suggestions.map(item=>`<button type="button" data-suggestion="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('')}</div>
      <form class="standard-assistant__composer"><label class="sr-only" for="standard-assistant-input">Escribí tu consulta</label><textarea id="standard-assistant-input" rows="1" maxlength="500" placeholder="Escribí tu consulta…"></textarea><button type="submit" aria-label="Enviar mensaje"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 17 8-17 8 3-8-3-8Zm3 8h14" fill="none" stroke="currentColor" stroke-width="2"/></svg></button></form>
      <p class="standard-assistant__status" aria-live="polite"></p></section>
      <button class="standard-assistant__launcher" type="button" aria-label="Abrir Luna, asistente virtual" aria-expanded="false" aria-controls="standard-assistant-panel"><span class="standard-assistant__launcher-card"><strong>Luna</strong><span>Asistente virtual</span><small>Impulsado por OpenAI</small><em>Encontrá tu repuesto más rápido</em></span><span class="standard-assistant__launcher-orb" aria-hidden="true"><span class="standard-assistant__launcher-icon"><svg viewBox="0 0 24 24"><path d="M7 18.5 3.5 21l1.1-4.2A8.25 8.25 0 1 1 7 18.5Z" fill="currentColor"/><path d="M8 10.2h8M8 13.8h5" fill="none" stroke="#6040d8" stroke-width="1.8" stroke-linecap="round"/></svg></span><span class="standard-assistant__ai-badge">IA</span></span></button>`;
    document.body.appendChild(root);render(root);
    const panel=root.querySelector('.standard-assistant__panel'),launcher=root.querySelector('.standard-assistant__launcher'),input=root.querySelector('textarea');
    const setOpen=open=>{panel.hidden=!open;launcher.setAttribute('aria-expanded',String(open));if(open)window.setTimeout(()=>input.focus(),50);};
    launcher.addEventListener('click',()=>setOpen(panel.hidden));root.querySelector('.standard-assistant__close').addEventListener('click',()=>setOpen(false));
    root.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const text=input.value.trim();if(!text)return;input.value='';respond(root,text);});
    root.querySelector('.standard-assistant__suggestions').addEventListener('click',event=>{const button=event.target.closest('[data-suggestion]');if(button)respond(root,button.dataset.suggestion);});
    root.querySelector('.standard-assistant__messages').addEventListener('click',event=>{const button=event.target.closest('[data-page]');if(button&&typeof window.showPage==='function'){window.showPage(button.dataset.page);setOpen(false);window.scrollTo({top:0,behavior:'smooth'});}});
    input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();root.querySelector('form').requestSubmit();}});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')setOpen(false);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initAssistant);else initAssistant();
})();

