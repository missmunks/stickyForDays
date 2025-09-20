const { createClient } = require('@supabase/supabase-js')
const corsHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'}
exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS'){return{statusCode:200,headers:corsHeaders,body:'ok'}}
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if(!url || !key){ return { statusCode:500, headers:corsHeaders, body: JSON.stringify({ error:'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' }) } }
  const s=createClient(url,key)
  if(event.httpMethod==='GET'){
    const {data,error}=await s.from('allergies').select('name,note,created_at').order('created_at',{ascending:false})
    if(error)return{statusCode:500,headers:corsHeaders,body:JSON.stringify({error:error.message})}
    return{statusCode:200,headers:corsHeaders,body:JSON.stringify({rows:data})}
  }
  if(event.httpMethod==='POST'){
    try{
      const {name,note}=JSON.parse(event.body||'{}')
      if(!note || !note.trim())return{statusCode:400,headers:corsHeaders,body:JSON.stringify({error:'note required'})}
      const payload={ name: (name||'Guest').slice(0,80), note: note.slice(0,280) }
      const {error}=await s.from('allergies').insert([payload])
      if(error) throw error
      return{statusCode:200,headers:corsHeaders,body:JSON.stringify({ok:true})}
    }catch(e){
      return{statusCode:500,headers:corsHeaders,body:JSON.stringify({error:e.message})}
    }
  }
  return{statusCode:405,headers:corsHeaders,body:'Method Not Allowed'}
}
