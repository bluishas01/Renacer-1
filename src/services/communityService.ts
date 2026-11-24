import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import type { CommunityPost, CommunityReply } from '../types/renacer';

function tsToIso(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

async function getBearerAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Debes iniciar sesión para continuar.');
  }
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function moderateWithServer(
  type: 'post' | 'reply',
  authorAlias: string,
  content: string
): Promise<void> {
  const headers = await getBearerAuthHeaders();
  const res = await fetch('/api/community/moderate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ type, authorAlias, content }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; allowed?: boolean };
  if (!res.ok || data.allowed === false) {
    throw new Error(data.error || 'El mensaje no superó la moderación de seguridad.');
  }
}

export async function fetchCommunityPosts(currentUid: string): Promise<CommunityPost[]> {
  const postsPath = 'communityPosts';
  try {
    const snap = await getDocs(
      query(collection(db, 'communityPosts'), where('hidden', '==', false))
    );

    const rawPosts = snap.docs
      .map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          authorUid: String(d.authorUid ?? ''),
          authorAlias: String(d.authorAlias ?? 'Integrante'),
          category: (d.category as CommunityPost['category']) ?? 'apoyo',
          content: String(d.content ?? ''),
          createdAt: tsToIso(d.createdAt),
          supportCount: Number(d.supportCount ?? 0),
          reportCount: Number(d.reportCount ?? 0),
          hidden: Boolean(d.hidden),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 60);

    const hydrated = await Promise.all(
      rawPosts.map(async (post) => {
        const repliesSnap = await getDocs(
          query(
            collection(db, 'communityPosts', post.id, 'replies'),
            where('postId', '==', post.id)
          )
        );
        const replies: CommunityReply[] = repliesSnap.docs
          .map((rDoc) => {
            const rd = rDoc.data();
            return {
              id: rDoc.id,
              postId: String(rd.postId ?? post.id),
              authorUid: String(rd.authorUid ?? ''),
              authorAlias: String(rd.authorAlias ?? 'Integrante'),
              content: String(rd.content ?? ''),
              createdAt: tsToIso(rd.createdAt),
            };
          })
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

        const [reactionSnap, reportSnap] = await Promise.all([
          getDoc(doc(db, 'communityPosts', post.id, 'reactions', currentUid)),
          getDoc(doc(db, 'communityPosts', post.id, 'reports', currentUid)),
        ]);

        return {
          ...post,
          supportedByMe: reactionSnap.exists(),
          reportedByMe: reportSnap.exists(),
          replies,
        } satisfies CommunityPost;
      })
    );

    return hydrated;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, postsPath);
  }
}

export async function createModeratedPost(input: {
  uid: string;
  authorAlias: string;
  category: 'logros' | 'apoyo' | 'estrategias';
  content: string;
}): Promise<CommunityPost> {
  const cleanAlias = input.authorAlias.trim().slice(0, 40);
  const cleanContent = input.content.trim().slice(0, 800);
  if (cleanAlias.length < 2 || cleanContent.length < 8) {
    throw new Error('Escribe un alias válido y un mensaje de al menos 8 caracteres.');
  }

  await moderateWithServer('post', cleanAlias, cleanContent);

  const postId = `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const postPath = `communityPosts/${postId}`;

  try {
    await setDoc(doc(db, 'communityPosts', postId), {
      authorUid: input.uid,
      authorAlias: cleanAlias,
      category: input.category,
      content: cleanContent,
      supportCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, postPath);
  }

  return {
    id: postId,
    authorUid: input.uid,
    authorAlias: cleanAlias,
    category: input.category,
    content: cleanContent,
    createdAt: new Date().toISOString(),
    supportCount: 0,
    reportCount: 0,
    hidden: false,
    supportedByMe: false,
    reportedByMe: false,
    replies: [],
  };
}

export async function createModeratedReply(input: {
  postId: string;
  uid: string;
  authorAlias: string;
  content: string;
}): Promise<CommunityReply> {
  const cleanAlias = input.authorAlias.trim().slice(0, 40);
  const cleanContent = input.content.trim().slice(0, 500);
  if (cleanAlias.length < 2 || cleanContent.length < 3) {
    throw new Error('Escribe una respuesta válida (mínimo 3 caracteres).');
  }

  await moderateWithServer('reply', cleanAlias, cleanContent);

  const replyId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const replyPath = `communityPosts/${input.postId}/replies/${replyId}`;

  try {
    await setDoc(doc(db, 'communityPosts', input.postId, 'replies', replyId), {
      postId: input.postId,
      authorUid: input.uid,
      authorAlias: cleanAlias,
      content: cleanContent,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, replyPath);
  }

  return {
    id: replyId,
    postId: input.postId,
    authorUid: input.uid,
    authorAlias: cleanAlias,
    content: cleanContent,
    createdAt: new Date().toISOString(),
  };
}

export async function toggleSupportReaction(
  postId: string,
  uid: string
): Promise<{ supportedByMe: boolean; supportCount: number }> {
  const postPath = `communityPosts/${postId}`;
  const postRef = doc(db, 'communityPosts', postId);
  const reactionRef = doc(db, 'communityPosts', postId, 'reactions', uid);

  try {
    return await runTransaction(db, async (tx) => {
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists()) {
        throw new Error('La publicación ya no está disponible.');
      }
      const currentCount = Number(postSnap.data().supportCount ?? 0);
      const reactionSnap = await tx.get(reactionRef);

      if (reactionSnap.exists()) {
        const nextCount = Math.max(0, currentCount - 1);
        tx.delete(reactionRef);
        tx.update(postRef, {
          supportCount: nextCount,
          updatedAt: serverTimestamp(),
        });
        return { supportedByMe: false, supportCount: nextCount };
      }

      const nextCount = currentCount + 1;
      tx.set(reactionRef, {
        postId,
        ownerId: uid,
        reactionType: 'apoyo',
        createdAt: serverTimestamp(),
      });
      tx.update(postRef, {
        supportCount: nextCount,
        updatedAt: serverTimestamp(),
      });
      return { supportedByMe: true, supportCount: nextCount };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, postPath);
  }
}

export async function submitCommunityReport(
  postId: string,
  uid: string,
  reason = 'Contenido reportado por la comunidad'
): Promise<{ reportedByMe: boolean; reportCount: number; hidden: boolean; updatedExisting: boolean }> {
  const postPath = `communityPosts/${postId}`;
  const postRef = doc(db, 'communityPosts', postId);
  const reportRef = doc(db, 'communityPosts', postId, 'reports', uid);
  const cleanReason = reason.trim().slice(0, 200) || 'Contenido reportado por la comunidad';

  try {
    return await runTransaction(db, async (tx) => {
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists()) {
        throw new Error('La publicación ya no existe.');
      }
      const data = postSnap.data();
      const currentReports = Number(data.reportCount ?? 0);
      const alreadyHidden = Boolean(data.hidden);
      const reportSnap = await tx.get(reportRef);

      if (reportSnap.exists()) {
        tx.update(reportRef, {
          reason: cleanReason,
          updatedAt: serverTimestamp(),
        });
        return {
          reportedByMe: true,
          reportCount: currentReports,
          hidden: alreadyHidden,
          updatedExisting: true,
        };
      }

      const nextReports = currentReports + 1;
      const nextHidden = nextReports >= 2 || alreadyHidden;
      tx.set(reportRef, {
        postId,
        ownerId: uid,
        reason: cleanReason,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      tx.update(postRef, {
        reportCount: nextReports,
        hidden: nextHidden,
        updatedAt: serverTimestamp(),
      });
      return {
        reportedByMe: true,
        reportCount: nextReports,
        hidden: nextHidden,
        updatedExisting: false,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, postPath);
  }
}

export async function withdrawCommunityReport(
  postId: string,
  uid: string
): Promise<{ reportedByMe: boolean; reportCount: number; hidden: boolean }> {
  const postPath = `communityPosts/${postId}`;
  const postRef = doc(db, 'communityPosts', postId);
  const reportRef = doc(db, 'communityPosts', postId, 'reports', uid);

  try {
    return await runTransaction(db, async (tx) => {
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists()) {
        throw new Error('La publicación ya no existe.');
      }
      const reportSnap = await tx.get(reportRef);
      const currentReports = Number(postSnap.data().reportCount ?? 0);
      if (!reportSnap.exists()) {
        return {
          reportedByMe: false,
          reportCount: currentReports,
          hidden: Boolean(postSnap.data().hidden),
        };
      }
      const nextReports = Math.max(0, currentReports - 1);
      const nextHidden = nextReports >= 2;
      tx.delete(reportRef);
      tx.update(postRef, {
        reportCount: nextReports,
        hidden: nextHidden,
        updatedAt: serverTimestamp(),
      });
      return {
        reportedByMe: false,
        reportCount: nextReports,
        hidden: nextHidden,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, postPath);
  }
}

export async function deleteOwnCommunityPost(postId: string, authorUid?: string): Promise<void> {
  const postPath = `communityPosts/${postId}`;
  try {
    if (authorUid) {
      const ownRepliesSnap = await getDocs(
        query(
          collection(db, 'communityPosts', postId, 'replies'),
          where('authorUid', '==', authorUid)
        )
      );
      for (const rDoc of ownRepliesSnap.docs) {
        await deleteDoc(rDoc.ref);
      }
    }
    await deleteDoc(doc(db, 'communityPosts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, postPath);
  }
}

export async function deleteOwnCommunityReply(postId: string, replyId: string): Promise<void> {
  const replyPath = `communityPosts/${postId}/replies/${replyId}`;
  try {
    await deleteDoc(doc(db, 'communityPosts', postId, 'replies', replyId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, replyPath);
  }
}
