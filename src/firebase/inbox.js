import {
  collection,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from './db'
import { formatMessageTime, getGroupChatLastReadMs } from './groupMessages'
import { getCurrentSessionKey } from './sessions'
import {
  getActiveParties,
  subscribeToWalkGroups,
  walkGroupUserHasAccepted,
} from './walkGroups'

function getOtherFamilyName(group, userId) {
  const otherParty = getActiveParties(group).find((party) => party.userId !== userId)
  return otherParty?.parentName?.split(/\s+/)[0] ?? 'Family'
}

async function fetchLastMessage(groupId) {
  const messagesQuery = query(
    collection(db, 'walkGroups', groupId, 'messages'),
    orderBy('createdAt', 'desc'),
  )
  const snapshot = await getDocs(messagesQuery)
  if (snapshot.empty) return null
  const docSnap = snapshot.docs[0]
  return { id: docSnap.id, ...docSnap.data() }
}

export function subscribeToInboxThreads(userId, onData, onError) {
  if (!userId) {
    onData([])
    return () => {}
  }

  let groups = []
  let unsubGroups = () => {}

  async function refreshThreads() {
    const acceptedGroups = groups.filter((g) => walkGroupUserHasAccepted(g, userId))
    const threads = await Promise.all(
      acceptedGroups.map(async (group) => {
        const lastMessage = await fetchLastMessage(group.id)
        const sessionKey = getCurrentSessionKey()
        const lastReadMs = getGroupChatLastReadMs(group.id, sessionKey)
        const createdMs = lastMessage?.createdAt?.toMillis?.() ?? 0
        const unread = lastMessage && lastMessage.userId !== userId && createdMs > lastReadMs

        return {
          id: group.id,
          groupId: group.id,
          familyName: getOtherFamilyName(group, userId),
          activity: group.location ?? 'Activity',
          lastMessage: lastMessage?.text ?? 'No messages yet',
          lastMessageTime: lastMessage ? formatMessageTime(lastMessage.createdAt) : '',
          lastMessageMs: createdMs,
          unread: Boolean(unread),
          pending: false,
        }
      }),
    )

    const pendingGroups = groups.filter(
      (g) =>
        !walkGroupUserHasAccepted(g, userId)
        && (g.parties ?? []).some((p) => p.userId === userId && p.response === 'pending'),
    )

    const pendingThreads = pendingGroups.map((group) => ({
      id: `pending-${group.id}`,
      groupId: group.id,
      familyName: getOtherFamilyName(group, userId),
      activity: group.location ?? 'Activity',
      lastMessage: 'Match request — tap to respond',
      lastMessageTime: '',
      lastMessageMs: Date.now(),
      unread: true,
      pending: true,
    }))

    onData(
      [...pendingThreads, ...threads].sort((a, b) => b.lastMessageMs - a.lastMessageMs),
    )
  }

  unsubGroups = subscribeToWalkGroups(
    userId,
    (nextGroups) => {
      groups = nextGroups
      refreshThreads().catch(onError)
    },
    onError,
  )

  return () => unsubGroups()
}

/** Subscribe to match-request threads from pending walk group invitations. */
export function subscribeToPendingMatchThreads(userId, onData, onError) {
  return subscribeToInboxThreads(userId, (threads) => {
    onData(threads.filter((t) => t.pending))
  }, onError)
}
