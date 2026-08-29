import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { deleteUser } from 'firebase/auth'
import { auth, logOut } from './auth'
import { deleteAllActivitySlots } from './activities'
import { db } from './db'
import { getActiveSession } from './groupWalk'

const BATCH_SIZE = 400

async function deleteDocs(snapshot) {
  if (snapshot.empty) return

  let batch = writeBatch(db)
  let count = 0

  for (const docSnap of snapshot.docs) {
    batch.delete(docSnap.ref)
    count += 1

    if (count >= BATCH_SIZE) {
      await batch.commit()
      batch = writeBatch(db)
      count = 0
    }
  }

  if (count > 0) {
    await batch.commit()
  }
}

async function deleteSubcollection(userId, subcollectionName) {
  const snapshot = await getDocs(collection(db, 'users', userId, subcollectionName))
  await deleteDocs(snapshot)
}

async function deleteQuery(collectionName, ...constraints) {
  const snapshot = await getDocs(query(collection(db, collectionName), ...constraints))
  await deleteDocs(snapshot)
}

async function deleteWalkGroupMessages(groupId) {
  const snapshot = await getDocs(collection(db, 'walkGroups', groupId, 'messages'))
  await deleteDocs(snapshot)
}

async function deleteSessionChildren(sessionId) {
  const snapshot = await getDocs(collection(db, 'walkSessions', sessionId, 'children'))
  await deleteDocs(snapshot)
}

async function removeUserFromWalkGroups(userId) {
  const groupSnapshot = await getDocs(
    query(collection(db, 'walkGroups'), where('participantIds', 'array-contains', userId)),
  )

  for (const groupDoc of groupSnapshot.docs) {
    if (await getActiveSession(groupDoc.id, userId)) {
      throw new Error('Cannot delete account while a walk is in progress.')
    }

    const group = groupDoc.data()
    const remainingParties = (group.parties ?? []).filter((party) => party.userId !== userId)
    const remainingParticipantIds = (group.participantIds ?? []).filter((id) => id !== userId)
    const remainingLeaders = (group.groupLeaders ?? []).filter((leader) => leader.userId !== userId)
    const remainingLeaderUserIds = (group.leaderUserIds ?? []).filter((id) => id !== userId)

    if (remainingParties.length === 0) {
      await deleteWalkGroupMessages(groupDoc.id)
      await deleteDoc(groupDoc.ref)
      continue
    }

    await updateDoc(groupDoc.ref, {
      parties: remainingParties,
      participantIds: remainingParticipantIds,
      groupLeaders: remainingLeaders,
      leaderUserIds: remainingLeaderUserIds,
    })
  }
}

async function removeUserFromWalkSessions(userId) {
  const sessionSnapshot = await getDocs(
    query(collection(db, 'walkSessions'), where('participantIds', 'array-contains', userId)),
  )

  for (const sessionDoc of sessionSnapshot.docs) {
    const session = sessionDoc.data()
    if (session.status === 'active' || session.status === 'in_progress') {
      throw new Error('Cannot delete account while a walk is in progress.')
    }

    const childrenSnapshot = await getDocs(
      collection(db, 'walkSessions', sessionDoc.id, 'children'),
    )

    for (const childDoc of childrenSnapshot.docs) {
      if (childDoc.data().userId === userId) {
        await deleteDoc(childDoc.ref)
      }
    }

    const remainingParticipants = (session.participantIds ?? []).filter((id) => id !== userId)
    if (remainingParticipants.length === 0) {
      await deleteSessionChildren(sessionDoc.id)
      await deleteDoc(sessionDoc.ref)
    } else {
      await updateDoc(sessionDoc.ref, { participantIds: remainingParticipants })
    }
  }
}

export async function deleteUserAccount(userId) {
  if (!userId) {
    throw new Error('You must be signed in to delete your account.')
  }

  await removeUserFromWalkSessions(userId)
  await removeUserFromWalkGroups(userId)

  await Promise.all([
    deleteSubcollection(userId, 'children'),
    deleteSubcollection(userId, 'activities'),
    deleteSubcollection(userId, 'notifications'),
    deleteAllActivitySlots(userId),
    deleteQuery('buildingWalkSlots', where('userId', '==', userId)),
    deleteQuery('walkHistory', where('userId', '==', userId)),
    deleteQuery('matches', where('participantIds', 'array-contains', userId)),
    deleteQuery('groupAbsences', where('userId', '==', userId)),
  ])

  await deleteDoc(doc(db, 'users', userId))

  const currentUser = auth.currentUser
  if (currentUser?.uid !== userId) {
    await logOut()
    return
  }

  try {
    await deleteUser(currentUser)
  } catch (error) {
    if (error?.code === 'auth/requires-recent-login') {
      await logOut()
      throw new Error(
        'Your data was removed. For security, sign in once more if you need to fully remove your login credentials.',
      )
    }
    await logOut()
    throw error
  }
}
