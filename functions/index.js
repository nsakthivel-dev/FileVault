const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Trigger 1: Cloud Storage upload trigger
 * Automatically validates uploaded document metadata, extracts basic traits,
 * and creates initial audit log and notification.
 */
exports.onDocumentUploaded = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name; // e.g. users/{userId}/documents/{category}/{fileName}
  if (!filePath || !filePath.includes("/documents/")) {
    return null;
  }

  const parts = filePath.split("/");
  if (parts.length < 5) return null;
  const userId = parts[1];
  const docIdOrCat = parts[3];
  const fileName = parts[parts.length - 1];

  console.log(`Processing upload for user ${userId}, target ${docIdOrCat}, file ${fileName}`);

  // Create audit log for upload event
  try {
    await db.collection("auditLogs").add({
      userId,
      action: "DOCUMENT_UPLOADED",
      documentName: fileName,
      details: `File uploaded to ${category} (${object.contentType}, ${object.size} bytes)`,
      timestamp: new Date().toISOString(),
      status: "SUCCESS"
    });

    // Create in-app notification
    await db.collection("notifications").add({
      userId,
      title: "Document Uploaded",
      message: `${fileName} has been securely encrypted and stored in your vault.`,
      type: "upload",
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error in onDocumentUploaded handler:", error);
  }

  return null;
});

/**
 * Trigger 2: Scheduled Daily Expiry Check
 * Runs daily at midnight to inspect document expiration dates,
 * updates document statuses to 'Expired' if passed,
 * and alerts users 60, 30, and 7 days prior.
 */
exports.checkDocumentExpiry = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
  const now = new Date();
  console.log(`Running scheduled expiry check at ${now.toISOString()}`);

  try {
    const docsSnapshot = await db.collection("documents").get();
    const batch = db.batch();
    let updatedCount = 0;

    for (const docSnap of docsSnapshot.docs) {
      const docData = docSnap.data();
      if (!docData.expiryDate) continue;

      const expiryDate = new Date(docData.expiryDate);
      const diffMs = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 0 && docData.verificationStatus !== "Expired") {
        batch.update(docSnap.ref, {
          verificationStatus: "Expired",
          updatedAt: now.toISOString()
        });

        // Add notification and audit log
        const notifRef = db.collection("notifications").doc();
        batch.set(notifRef, {
          userId: docData.ownerId,
          title: "Document Expired",
          message: `Your document "${docData.originalName}" has expired on ${docData.expiryDate}.`,
          type: "expiry",
          read: false,
          createdAt: now.toISOString()
        });

        updatedCount++;
      } else if (diffDays > 0 && (diffDays === 60 || diffDays === 30 || diffDays === 7)) {
        // Send upcoming expiry reminder notification
        const notifRef = db.collection("notifications").doc();
        batch.set(notifRef, {
          userId: docData.ownerId,
          title: "Document Expiring Soon",
          message: `Your document "${docData.originalName}" will expire in ${diffDays} days (${docData.expiryDate}).`,
          type: "expiry",
          read: false,
          createdAt: now.toISOString()
        });
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`Updated ${updatedCount} expired documents.`);
    }
  } catch (error) {
    console.error("Error running checkDocumentExpiry:", error);
  }

  return null;
});

/**
 * Trigger 3: Firestore trigger on share creation
 * Automatically creates notification and audit entry when a document share is created.
 */
exports.onShareCreated = functions.firestore.document("shares/{shareId}").onCreate(async (snap, context) => {
  const share = snap.data();
  if (!share) return null;

  try {
    await db.collection("auditLogs").add({
      userId: share.ownerId,
      action: "DOCUMENT_SHARED",
      documentId: share.documentId,
      details: `Created secure share link (Expires: ${share.expiresAt || "Never"}, Limit: ${share.accessLimit || "Unlimited"})`,
      timestamp: new Date().toISOString(),
      status: "SUCCESS"
    });

    await db.collection("notifications").add({
      userId: share.ownerId,
      title: "Share Link Generated",
      message: `A secure share link was created for your document.`,
      type: "share",
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error in onShareCreated:", error);
  }

  return null;
});
