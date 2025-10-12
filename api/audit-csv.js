export const config = { runtime: 'nodejs' };
import { createClient } from '@supabase/supabase-js';

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
  return s;
}

export default async function handler(req, res) {
  try {
    const pollId = (req.query && req.query.p) || process.env.VITE_POLL_ID;
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession:false } }
    );
    const { data, error } = await supabase
      .from('vote_audit')
      .select('created_at,unit_id,option_id,voter_name,ip,user_agent')
      .eq('poll_id', pollId)
      .order('created_at', { ascending:false });

    if (error) {
      res.status(500).send('Supabase error: ' + error.message);
      return;
    }

    const header = ['time_utc','unit_id','option_id','voter_name','ip','user_agent'].join(',');
    const body = (data||[]).map(r => [
      csvEscape(r.created_at),
      csvEscape(r.unit_id),
      csvEscape(r.option_id),
      csvEscape(r.voter_name),
      csvEscape(r.ip),
      csvEscape(r.user_agent)
    ].join(',')).join('\r\n');

    const BOM='\uFEFF';
    const csv = `${BOM}${header}\r\n${body}`;

    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition',`attachment; filename="audit-${pollId}.csv"`);
    res.status(200).send(csv);
  } catch (e) {
    res.status(500).send('API error: ' + e.message);
  }
}
