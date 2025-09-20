const { createClient } = require('@supabase/supabase-js')
const corsHeaders = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'}
function isAdmin(event){const token=(event.headers['authorization']||event.headers['Authorization']||'').split(' ')[1]||'';const expected=process.env.ADMIN_TOKEN||'';return expected&&token&&token===expected}
exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS'){return{statusCode:200,headers:corsHeaders,body:'ok'}}
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE
  if(!url||!key){ return { statusCode:500, headers:corsHeaders, body: JSON.stringify({ error:'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' }) } }
  const s=createClient(url,key)
  const admin=event.queryStringParameters&&event.queryStringParameters.admin==='1';

  if(event.httpMethod==='GET'){
    const cols=admin?'id,name,count,created_at':'name,count';
    if(admin&&!isAdmin(event))return{statusCode:401,headers:corsHeaders,body:JSON.stringify({error:'Unauthorized'})};
    const {data,error}=await s.from('rsvps').select(cols).order('created_at',{ascending:true});
    if(error)return{statusCode:500,headers:corsHeaders,body:JSON.stringify({error:error.message})};
    if((event.queryStringParameters||{}).format==='csv'){
      const header=admin?['id','name','count','created_at']:['name','count'];
      const rows=[header.join(',')];
      for(const row of data)rows.push(header.map(k=>row[k]??'').join(','));
      return{statusCode:200,headers:{...corsHeaders,'Content-Type':'text/csv','Content-Disposition':'attachment; filename="rsvps.csv"'},body:rows.join('\n')}
    }
    return{statusCode:200,headers:corsHeaders,body:JSON.stringify({rows:data})}
  }

  if(event.httpMethod==='POST'){
    try{
      const {name,count,agreed}=JSON.parse(event.body||'{}');
      if(!agreed) return {statusCode:400,headers:corsHeaders,body:JSON.stringify({error:'waiver not accepted'})}
      if(!name)return{statusCode:400,headers:corsHeaders,body:JSON.stringify({error:'Name required'})};
      const safe=Number(count)||1;
      const {error}=await s.from('rsvps').insert([{name,count:safe}]);
      if(error)throw error;
      return{statusCode:200,headers:corsHeaders,body:JSON.stringify({ok:true})}
    }catch(e){
      return{statusCode:500,headers:corsHeaders,body:JSON.stringify({error:e.message})}
    }
  }

  if(event.httpMethod==='DELETE'){
    if(!isAdmin(event))return{statusCode:401,headers:corsHeaders,body:JSON.stringify({error:'Unauthorized'})};
    try{
      const {id}=JSON.parse(event.body||'{}');
      if(!id)return{statusCode:400,headers:corsHeaders,body:JSON.stringify({error:'id required'})};
      const {error}=await s.from('rsvps').delete().eq('id',id);
      if(error)throw error;
      return{statusCode:200,headers:corsHeaders,body:JSON.stringify({ok:true})}
    }catch(e){
      return{statusCode:500,headers:corsHeaders,body:JSON.stringify({error:e.message})}
    }
  }

  return{statusCode:405,headers:corsHeaders,body:'Method Not Allowed'}
}
