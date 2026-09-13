import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'documents';

console.log('--- Testing Supabase Connection ---');
console.log('Project URL:', url);
console.log('Bucket Name:', bucketName);

if (!url || !key) {
  console.error('ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function runDiagnostics() {
  const results = {
    auth: false,
    storageBucket: false,
    storageUpload: false,
    dbAuditLogs: false,
    dbDocuments: false,
    dbUsers: false,
  };

  // 1. Test Storage Buckets
  try {
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) {
      console.log('❌ Storage Buckets Error:', bErr.message);
    } else {
      console.log('Found Buckets:', buckets.map(b => b.name));
      const found = buckets.some(b => b.name === bucketName || b.id === bucketName);
      if (found) {
        console.log(`✅ Storage Bucket "${bucketName}" is active and ready!`);
        results.storageBucket = true;
      } else {
        console.log(`⚠️ Storage Bucket "${bucketName}" not found. Available buckets:`, buckets.map(b => b.name));
      }
    }
  } catch (e) {
    console.log('❌ Storage Error:', e.message);
  }

  // 2. Test File Upload to Storage
  if (results.storageBucket) {
    try {
      const testPath = `system_health_check/test_${Date.now()}.txt`;
      const testBuffer = Buffer.from('FileVault Supabase connectivity verified successfully.');
      const { error: upErr } = await supabase.storage.from(bucketName).upload(testPath, testBuffer, { upsert: true });
      if (upErr) {
        console.log('❌ Test File Upload Error:', upErr.message);
      } else {
        console.log(`✅ Storage Upload & Read Verified! (Successfully wrote: ${testPath})`);
        results.storageUpload = true;
        // Clean up
        await supabase.storage.from(bucketName).remove([testPath]);
      }
    } catch (e) {
      console.log('❌ Storage File Test Error:', e.message);
    }
  }

  // 3. Test Database: audit_logs
  try {
    const testLogId = 'health-test-' + Date.now();
    const { error: logErr } = await supabase.from('audit_logs').insert({
      id: testLogId,
      user_id: 'system_health_check',
      action: 'HEALTH_CHECK',
      details: 'Connectivity verification from FileVault',
      status: 'SUCCESS',
    });

    if (logErr) {
      console.log('⚠️ audit_logs table:', logErr.message);
      if (logErr.code === '42P01') {
        console.log('👉 Table "audit_logs" has not been created yet in Supabase.');
      }
    } else {
      console.log('✅ Database: "audit_logs" table write & read verified!');
      results.dbAuditLogs = true;
      // Clean up test row
      await supabase.from('audit_logs').delete().eq('id', testLogId);
    }
  } catch (e) {
    console.log('❌ audit_logs error:', e.message);
  }

  // 4. Test Database: documents table
  try {
    const { data, error: docErr } = await supabase.from('documents').select('id').limit(1);
    if (docErr) {
      console.log('⚠️ documents table:', docErr.message);
      if (docErr.code === '42P01') {
        console.log('👉 Table "documents" has not been created yet in Supabase.');
      }
    } else {
      console.log('✅ Database: "documents" table verified!');
      results.dbDocuments = true;
    }
  } catch (e) {
    console.log('❌ documents table error:', e.message);
  }

  // 5. Test Database: users table
  try {
    const { data, error: userErr } = await supabase.from('users').select('id').limit(1);
    if (userErr) {
      console.log('⚠️ users table:', userErr.message);
    } else {
      console.log('✅ Database: "users" table verified!');
      results.dbUsers = true;
    }
  } catch (e) {
    console.log('❌ users table error:', e.message);
  }

  console.log('\n--- Diagnostic Results ---');
  console.log(JSON.stringify(results, null, 2));
}

runDiagnostics();
