import { useState } from 'react';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';
import { Text } from '../../src/i18n';
import { Page, Card, Button, styles } from '../../src/components/settings/SettingsUI';
export default function Admin(){
 const profile=useAuthStore(s=>s.profile); const allowed=profile?.role==='admin';const client=useQueryClient();
 const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const users=useQuery({queryKey:['admin-users'],enabled:allowed,queryFn:()=>api<{id:string;full_name:string;email:string;role:string;suspended:boolean}[]>('/settings/admin/users')});
 const reports=useQuery({queryKey:['admin-reports'],enabled:allowed,queryFn:()=>api<{id:string;message:string;status:string}[]>('/settings/admin/reports')});
 async function act(path:string,body:unknown){setBusy(true);try{await api(`/settings/admin/${path}`,{method:'POST',body:JSON.stringify(body)});await client.invalidateQueries({queryKey:['admin-users']});await client.invalidateQueries({queryKey:['admin-reports']});setNotice('Changes saved');}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
 return <Page title="Admin Panel">{!allowed?<Text>Administrator access required</Text>:<>
 {notice?<Text style={styles.notice}>{notice}</Text>:null}
 <Card title="Users">{users.isPending?<Text>Loading…</Text>:users.isError?<Button title="Retry" onPress={()=>void users.refetch()}/>:users.data?.map(user=><View key={user.id} style={styles.row}><View style={{flex:1}}><Text style={styles.label}>{user.full_name}</Text><Text>{user.email}</Text></View>{user.role!=='admin'?<Button title={user.suspended?'Restore':'Suspend'} busy={busy} onPress={()=>void act('suspend',{userId:user.id,suspended:!user.suspended})}/>:null}</View>)}</Card>
 <Card title="Reports">{reports.isPending?<Text>Loading…</Text>:reports.isError?<Button title="Retry" onPress={()=>void reports.refetch()}/>:reports.data?.length?reports.data.map(report=><View key={report.id} style={{paddingVertical:12}}><Text>{report.message}</Text>{report.status==='open'?<Button title="Resolve" busy={busy} onPress={()=>void act('resolve',{id:report.id})}/>:<Text>Resolved</Text>}</View>):<Text>No items yet.</Text>}</Card>
 </>}</Page>;
}
