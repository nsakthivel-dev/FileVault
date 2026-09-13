import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "documents";

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const targetEmail = "sakthicud07@gmail.com";
  console.log(`\n=== 1. Finding Auth User for ${targetEmail} ===`);
  
  const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error("Failed to list users:", userError.message);
    process.exit(1);
  }

  const user = userData.users.find(
    (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
  );

  let userId: string;
  let username: string;

  if (user) {
    userId = user.id;
    username = (user.user_metadata as any)?.username || user.email?.split("@")[0] || "sakthicud07";
    console.log(`Found Auth user: ID=${userId}, Email=${user.email}, Username=${username}`);
  } else {
    console.log(`Auth user for ${targetEmail} not found in auth.users, using sanitized id`);
    userId = "sakthicud07_gmail_com";
    username = "sakthicud07";
  }

  console.log(`\n=== 2. Upserting into public.users table ===`);
  const { error: upsertUserErr } = await supabase.from("users").upsert({
    id: userId,
    username: username,
    email: targetEmail,
    name: (user?.user_metadata as any)?.name || (user?.user_metadata as any)?.full_name || "Sakthi Cud",
    updated_at: new Date().toISOString(),
  });
  if (upsertUserErr) {
    console.warn("Notice upserting public.users:", upsertUserErr.message);
  } else {
    console.log(`Successfully verified user ${userId} in public.users`);
  }

  console.log(`\n=== 3. Inspecting Storage for sakthicud07 ===`);
  const folderNames = ["sakthicud07_gmail_com", userId];
  let foundDocs: any[] = [];
  let activeFolder = "sakthicud07_gmail_com";

  for (const f of folderNames) {
    console.log(`Checking storage path: users/${f}`);
    const { data: manifestData, error: manErr } = await supabase.storage
      .from(bucketName)
      .download(`users/${f}/.vault_manifest.json`);

    if (manifestData) {
      try {
        const parsed = JSON.parse(await manifestData.text());
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`Found manifest in users/${f}/.vault_manifest.json with ${parsed.length} document(s)`);
          foundDocs = parsed;
          activeFolder = f;
          break;
        }
      } catch (e: any) {
        console.warn(`Could not parse manifest in users/${f}:`, e.message);
      }
    }
  }

  // Also list files directly in users/sakthicud07_gmail_com
  console.log(`Listing files in storage under users/${activeFolder}...`);
  const { data: rootList } = await supabase.storage.from(bucketName).list(`users/${activeFolder}`);
  console.log("Root folder contents:", rootList?.map((item) => item.name));

  const { data: docList } = await supabase.storage.from(bucketName).list(`users/${activeFolder}/documents`);
  console.log("documents folder contents:", docList?.map((item) => item.name));

  // If manifest had nothing, traverse category subfolders
  if (foundDocs.length === 0 && docList) {
    for (const cat of docList) {
      const { data: catFiles } = await supabase.storage
        .from(bucketName)
        .list(`users/${activeFolder}/documents/${cat.name}`);
      if (catFiles) {
        for (const file of catFiles) {
          if (file.name.endsWith(".meta.json")) {
            const { data: metaBlob } = await supabase.storage
              .from(bucketName)
              .download(`users/${activeFolder}/documents/${cat.name}/${file.name}`);
            if (metaBlob) {
              try {
                const metaDoc = JSON.parse(await metaBlob.text());
                foundDocs.push(metaDoc);
              } catch {}
            }
          } else if (!catFiles.some(cf => cf.name === `${file.name}.meta.json`)) {
            // Document file without separate meta
            foundDocs.push({
              id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              ownerId: userId,
              fileName: file.name,
              originalName: file.name,
              documentType: cat.name || "other",
              storagePath: `users/${activeFolder}/documents/${cat.name}/${file.name}`,
              mimeType: file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
              fileSize: (file as any).metadata?.size || 102400,
              uploadedAt: file.created_at || new Date().toISOString(),
              verificationStatus: "Verified",
              processingStatus: "completed",
            });
          }
        }
      }
    }
  }

  console.log(`\n=== 4. Total documents discovered: ${foundDocs.length} ===`);
  for (const doc of foundDocs) {
    console.log(`- Document: [${doc.id}] ${doc.fileName || doc.title} (${doc.documentType})`);
    doc.ownerId = userId; // Ensure ownerId matches current user ID

    // Map doc to Supabase columns
    const row = {
      id: doc.id,
      owner_id: userId,
      file_name: doc.fileName || doc.originalName || "document",
      original_name: doc.originalName || doc.fileName || "document",
      document_type: doc.documentType || "other",
      sub_type: doc.subType || null,
      title: doc.title || doc.fileName || null,
      person_name: doc.personName || null,
      organization: doc.organization || null,
      recipient_name: doc.recipientName || null,
      institution: doc.institution || null,
      certificate_number: doc.certificateNumber || null,
      description: doc.description || null,
      achievement: doc.achievement || null,
      rank: doc.rank || null,
      storage_path: doc.storagePath,
      mime_type: doc.mimeType || "application/octet-stream",
      file_size: doc.fileSize || 0,
      sha256: doc.sha256 || null,
      issue_date: doc.issueDate && /^\d{4}-\d{2}-\d{2}$/.test(doc.issueDate) ? doc.issueDate : null,
      expiry_date: doc.expiryDate && /^\d{4}-\d{2}-\d{2}$/.test(doc.expiryDate) ? doc.expiryDate : null,
      skills: Array.isArray(doc.skills) ? doc.skills : [],
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      confidence: Number(doc.confidence || 0),
      uncertain_fields: Array.isArray(doc.uncertainFields) ? doc.uncertainFields : [],
      verification_status: doc.verificationStatus || "Verified",
      processing_status: doc.processingStatus || "completed",
      duplicate_status: doc.duplicateStatus || "unique",
      duplicate_of_id: doc.duplicateOfId || null,
      ai_processed: Boolean(doc.aiProcessed),
      ai_raw_response: doc.aiRawResponse || null,
      education_details: doc.educationDetails || null,
      employment_details: doc.employmentDetails || null,
      is_deleted: Boolean(doc.isDeleted),
      deleted_at: doc.deletedAt || null,
      is_pinned: Boolean(doc.isPinned),
      pinned_at: doc.pinnedAt || null,
      uploaded_at: doc.uploadedAt || new Date().toISOString(),
      updated_at: doc.updatedAt || new Date().toISOString(),
    };

    console.log(`Upserting document "${doc.id}" into public.documents table...`);
    const { error: docUpsertErr } = await supabase.from("documents").upsert(row);
    if (docUpsertErr) {
      console.error(`Failed to upsert doc "${doc.id}":`, docUpsertErr.message);
    } else {
      console.log(`✓ Upserted document "${doc.id}" successfully`);
    }

    // Insert Audit Log for document
    console.log(`Recording audit log for document "${doc.fileName}"...`);
    const { error: logErr } = await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "UPLOAD",
      document_id: doc.id,
      document_name: doc.fileName || doc.title,
      details: {
        note: "Vault document synchronized from cloud storage",
        category: doc.documentType,
        sha256: doc.sha256 || null,
      },
      timestamp: doc.uploadedAt || new Date().toISOString(),
      status: "SUCCESS",
      ip_address: "127.0.0.1",
    });
    if (logErr) {
      console.warn(`Audit log insert notice:`, logErr.message);
    } else {
      console.log(`✓ Audit log recorded for "${doc.fileName}"`);
    }
  }

  // Update .vault_manifest.json in storage
  console.log(`\n=== 5. Updating storage manifest for users/${activeFolder} ===`);
  await supabase.storage.from(bucketName).upload(
    `users/${activeFolder}/.vault_manifest.json`,
    Buffer.from(JSON.stringify(foundDocs, null, 2), "utf-8"),
    { upsert: true, contentType: "application/json" }
  );
  console.log(`✓ Updated users/${activeFolder}/.vault_manifest.json`);

  // If userId is different from folder name, also update under userId folder
  if (activeFolder !== userId) {
    await supabase.storage.from(bucketName).upload(
      `users/${userId}/.vault_manifest.json`,
      Buffer.from(JSON.stringify(foundDocs, null, 2), "utf-8"),
      { upsert: true, contentType: "application/json" }
    );
    console.log(`✓ Mirrored manifest to users/${userId}/.vault_manifest.json`);
  }

  console.log("\n=== Synchronization Complete! ===");
}

main().catch(console.error);
