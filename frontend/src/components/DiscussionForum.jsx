import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5002';

const formatDate = (d) => new Date(d).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * DiscussionForum — real-time forum component for EventDetails.
 * Uses socket.io-client for live messages.
 */
const DiscussionForum = ({ eventId, isRegistered, isOrganizerOrAdmin }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, name }
  const [error, setError] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const listRef = useRef(null);

  const canPost = isRegistered || isOrganizerOrAdmin;

  const isAtBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance < 40;
  };

  // Load history
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/forum/${eventId}`);
        setMessages(res.data.messages || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load messages');
      }
    };
    load();
  }, [eventId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      if (isAtBottom()) setHasUnread(false);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Socket connection
  useEffect(() => {
    const socket = io(BACKEND_URL, { withCredentials: true });
    socketRef.current = socket;
    socket.emit('forum:join', eventId);

    socket.on('message:new', (msg) => {
      setMessages((prev) => {
        const next = [...prev, msg];
        if (!isAtBottom()) setHasUnread(true);
        return next;
      });
    });
    socket.on('message:deleted', ({ msgId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === msgId ? { ...m, isDeleted: true } : m))
      );
    });
    socket.on('message:updated', (updated) => {
      setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
    });

    return () => {
      socket.emit('forum:leave', eventId);
      socket.disconnect();
    };
  }, [eventId]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isAtBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    try {
      await api.post(`/forum/${eventId}`, {
        message: text,
        parentId: replyTo?.id || null,
        type: isAnnouncement ? 'announcement' : 'message',
      });
      setInput('');
      setReplyTo(null);
      setIsAnnouncement(false);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    }
  };

  const deleteMsg = async (msgId) => {
    try {
      await api.delete(`/forum/message/${msgId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const pinMsg = async (msgId) => {
    try {
      await api.patch(`/forum/message/${msgId}/pin`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to pin');
    }
  };

  const toggleReaction = async (msgId, emoji) => {
    try {
      await api.post(`/forum/message/${msgId}/react`, { emoji });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to react');
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const visible = messages.filter((m) => !m.isDeleted && !m.parentId);
  const pinned = visible.filter((m) => m.isPinned);
  const unpinned = visible.filter((m) => !m.isPinned);
  const getReplies = (parentId) => messages.filter((m) => !m.isDeleted && String(m.parentId) === String(parentId));

  const renderMessage = (msg) => {
    const isMine = String(msg.user?._id || msg.user) === String(user?.id);
    const replies = getReplies(msg._id);
    const reactionCounts = (msg.reactions || []).reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {});
    const myReactions = new Set(
      (msg.reactions || [])
        .filter((r) => String(r.user) === String(user?.id))
        .map((r) => r.emoji)
    );

    return (
      <div
        key={msg._id}
        style={{
          borderLeft: msg.isPinned ? '3px solid var(--primary)' : '3px solid transparent',
          paddingLeft: '0.75rem',
          marginBottom: '0.75rem',
          background: msg.type === 'announcement' ? 'var(--surface)' : 'transparent',
          borderRadius: 6,
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
          paddingRight: '0.75rem',
        }}
      >
        <div className="h-stack" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontWeight: 600, marginRight: '0.5rem' }}>{msg.user?.name || 'User'}</span>
            {msg.user?.role === 'organizer' && <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>Organizer</span>}
            {msg.isPinned && <span className="badge badge-green" style={{ fontSize: '0.7rem', marginLeft: '0.25rem' }}>Pinned</span>}
            {msg.type === 'announcement' && <span className="badge badge-orange" style={{ fontSize: '0.7rem', marginLeft: '0.25rem' }}>Announcement</span>}
            <span className="muted" style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>{formatDate(msg.createdAt)}</span>
          </div>
          <div className="h-stack" style={{ gap: '0.25rem' }}>
            {canPost && (
              <button className="ghost" style={{ fontSize: '0.75rem', padding: '2px 6px' }} onClick={() => setReplyTo({ id: msg._id, name: msg.user?.name })}>↩ Reply</button>
            )}
            {isOrganizerOrAdmin && (
              <>
                <button className="ghost" style={{ fontSize: '0.75rem', padding: '2px 6px' }} onClick={() => pinMsg(msg._id)}>{msg.isPinned ? 'Unpin' : 'Pin'}</button>
                <button className="ghost" style={{ fontSize: '0.75rem', padding: '2px 6px', color: 'var(--error)' }} onClick={() => deleteMsg(msg._id)}>Delete</button>
              </>
            )}
          </div>
        </div>
        <p style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>{msg.message}</p>

        <div className="h-stack" style={{ gap: '0.35rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
          {['👍', '🎉', '❤️', '❓'].map((emoji) => (
            <button
              key={emoji}
              className="ghost"
              style={{
                fontSize: '0.85rem',
                padding: '3px 8px',
                border: '1px solid var(--border)',
                borderRadius: 12,
                background: myReactions.has(emoji) ? 'var(--hover)' : 'transparent',
              }}
              onClick={() => toggleReaction(msg._id, emoji)}
            >
              {emoji} {reactionCounts[emoji] ? <span style={{ fontWeight: 600 }}>{reactionCounts[emoji]}</span> : null}
            </button>
          ))}
        </div>

        {/* Thread replies */}
        {replies.length > 0 && (
          <div style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
            {replies.map((r) => {
              const replyReactionCounts = (r.reactions || []).reduce((acc, x) => {
                acc[x.emoji] = (acc[x.emoji] || 0) + 1;
                return acc;
              }, {});
              const replyMyReactions = new Set(
                (r.reactions || [])
                  .filter((x) => String(x.user) === String(user?.id))
                  .map((x) => x.emoji)
              );

              return (
                <div key={r._id} style={{ borderLeft: '2px solid var(--border)', paddingLeft: '0.5rem', marginBottom: '0.5rem' }}>
                  <div className="h-stack" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, marginRight: '0.25rem', fontSize: '0.9rem' }}>{r.user?.name || 'User'}</span>
                    <div className="h-stack" style={{ gap: '0.25rem' }}>
                      {isOrganizerOrAdmin && (
                        <button className="ghost" style={{ fontSize: '0.7rem', padding: '1px 5px', color: 'var(--error)' }} onClick={() => deleteMsg(r._id)}>Delete</button>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{r.message}</p>
                  <div className="h-stack" style={{ gap: '0.25rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    {['👍', '🎉', '❤️', '❓'].map((emoji) => (
                      <button
                        key={emoji}
                        className="ghost"
                        style={{
                          fontSize: '0.8rem',
                          padding: '2px 6px',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          background: replyMyReactions.has(emoji) ? 'var(--hover)' : 'transparent',
                        }}
                        onClick={() => toggleReaction(r._id, emoji)}
                      >
                        {emoji} {replyReactionCounts[emoji] ? <span style={{ fontWeight: 600 }}>{replyReactionCounts[emoji]}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card stack">
      <h4>Discussion Forum</h4>
      {!canPost && (
        <p className="muted">You must be registered for this event to post messages.</p>
      )}

      {hasUnread && (
        <div className="h-stack" style={{ justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '6px 10px', borderRadius: 8 }}>
          <span className="muted" style={{ fontSize: '0.9rem' }}>New messages</span>
          <button className="ghost" onClick={() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            setHasUnread(false);
          }}>Jump to latest</button>
        </div>
      )}

      <div ref={listRef} style={{ maxHeight: '400px', overflowY: 'auto', padding: '0.5rem 0' }}>
        {pinned.length > 0 && (
          <div>
            <p className="muted" style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>📌 Pinned</p>
            {pinned.map(renderMessage)}
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />
          </div>
        )}
        {unpinned.length === 0 && pinned.length === 0 && (
          <p className="muted">No messages yet. Be the first to post!</p>
        )}
        {unpinned.map(renderMessage)}
        <div ref={bottomRef} />
      </div>

      {canPost && (
        <div className="stack">
          {replyTo && (
            <div className="h-stack" style={{ background: 'var(--surface)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
              <span className="muted">Replying to <strong>{replyTo.name}</strong></span>
              <button className="ghost" style={{ padding: '2px 6px', fontSize: '0.8rem' }} onClick={() => setReplyTo(null)}>×</button>
            </div>
          )}
          {isOrganizerOrAdmin && !replyTo && (
            <label className="checkbox" style={{ alignItems: 'center', gap: '0.4rem' }}>
              <input type="checkbox" checked={isAnnouncement} onChange={(e) => setIsAnnouncement(e.target.checked)} />
              <span className="muted">Mark as announcement (organizers/admins only)</span>
            </label>
          )}
          <div className="h-stack">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={replyTo ? `Reply to ${replyTo.name}…` : 'Type a message… (Enter to send)'}
              rows={2}
              style={{ flex: 1, resize: 'vertical' }}
            />
            <button onClick={send} disabled={!input.trim()}>Send</button>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default DiscussionForum;
