const fileInput=document.getElementById('media');
const go=document.getElementById('go');
const statusEl=document.getElementById('status');
const result=document.getElementById('result');
let srtText='';
go.addEventListener('click',async()=>{
  const file=fileInput.files[0];
  if(!file){statusEl.textContent='ဖိုင်တစ်ခု အရင်ရွေးပါ။';return;}
  if(file.size>3.5*1024*1024){statusEl.textContent='ဖိုင်အရွယ်အစား 3.5 MB ထက်ကြီးနေပါတယ်။ ဖိုင်အသေးသုံးပါ။';return;}
  go.disabled=true;statusEl.textContent='လုပ်ဆောင်နေပါတယ်။ ခဏစောင့်ပါ…';result.hidden=true;
  try{
    const form=new FormData();form.append('file',file);
    const res=await fetch('/.netlify/functions/transcribe',{method:'POST',body:form});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'လုပ်ဆောင်မှု မအောင်မြင်ပါ။');
    document.getElementById('myanmar').textContent=data.text;
    srtText=data.srt||'';
    result.hidden=false;statusEl.textContent='ပြီးပါပြီ။';
  }catch(e){statusEl.textContent='အမှား: '+e.message;}
  finally{go.disabled=false;}
});
document.getElementById('copy').addEventListener('click',async()=>{
  await navigator.clipboard.writeText(document.getElementById('myanmar').textContent);
  statusEl.textContent='စာသား Copy လုပ်ပြီးပါပြီ။';
});
document.getElementById('srt').addEventListener('click',()=>{
  const blob=new Blob([srtText],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='myanmar-subtitle.srt';a.click();URL.revokeObjectURL(a.href);
});
