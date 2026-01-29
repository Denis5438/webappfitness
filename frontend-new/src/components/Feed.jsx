import React, { useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Trash2, Camera, Send, User } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://fitness-backendnew.replit.app/api';

const Feed = ({ user, fetchWithRetry, showToast }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    // ... (previous code)

    // Comments State
    const [activePostId, setActivePostId] = useState(null);
    const [showCommentModal, setShowCommentModal] = useState(false);

    // ... (fetchFeed logic)

    const handleOpenComments = (postId) => {
        setActivePostId(postId);
        setShowCommentModal(true);
    };

    return (
        <div className="pb-20">
            {/* Header ... */}
            <div className="flex items-center justify-between p-4 sticky top-0 bg-[#0d0d0d] z-10 border-b border-white/10">
                <h1 className="text-2xl font-bold">Лента</h1>
                <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 p-2 rounded-xl">
                    <Camera className="w-6 h-6" />
                </button>
            </div>

            <div className="space-y-4 p-4">
                {posts.map(post => (
                    <PostCard
                        key={post.id}
                        post={post}
                        currentUserId={user?.telegramId}
                        onLike={() => handleLike(post.id)}
                        onComment={() => handleOpenComments(post.id)}
                        onDelete={() => handleDelete(post.id)}
                    />
                ))}

                {loading && <div className="text-center text-gray-500 py-4">Загрузка...</div>}
                {!loading && posts.length === 0 && <div className="text-center text-gray-500 py-10">Пока нет постов. Будьте первым!</div>}
            </div>

            {showCreateModal && (
                <CreatePostModal
                    onClose={() => setShowCreateModal(false)}
                    onPostCreated={() => { setShowCreateModal(false); fetchFeed(); }}
                    fetchWithRetry={fetchWithRetry}
                    showToast={showToast}
                />
            )}

            {showCommentModal && activePostId && (
                <CommentModal
                    postId={activePostId}
                    onClose={() => { setShowCommentModal(false); setActivePostId(null); }}
                    fetchWithRetry={fetchWithRetry}
                    currentUserId={user?.telegramId}
                />
            )}
        </div>
    );
};

const PostCard = ({ post, currentUserId, onLike, onComment, onDelete }) => {
    const isAuthor = post.author_id === currentUserId;
    const isTrainer = post.author_roles?.includes('TRAINER');

    return (
        <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5">
            <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {post.author_avatar ? (
                        <img src={post.author_avatar} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                            <User className="w-5 h-5" />
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-1">
                            <span className="font-semibold">{post.author_name}</span>
                            {isTrainer && <span className="text-blue-400 text-xs px-1 border border-blue-400 rounded">TRAINER</span>}
                        </div>
                        <span className="text-xs text-gray-500">{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                {isAuthor && (
                    <button onClick={onDelete} className="text-gray-500 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {post.content && <div className="px-3 pb-2 text-sm whitespace-pre-wrap">{post.content}</div>}

            {post.image_url && (
                <img src={post.image_url} className="w-full bg-black aspect-square object-cover" loading="lazy" />
            )}

            <div className="p-3 flex items-center gap-4">
                <button onClick={onLike} className={`flex items-center gap-1.5 ${post.isLiked ? 'text-red-500' : 'text-gray-400'}`}>
                    <Heart className={`w-6 h-6 ${post.isLiked ? 'fill-current' : ''}`} />
                    <span>{post.likes_count}</span>
                </button>
                <button onClick={onComment} className="flex items-center gap-1.5 text-gray-400">
                    <MessageCircle className="w-6 h-6" />
                    <span>Коммент</span>
                </button>
            </div>
        </div>
    );
};

const CommentModal = ({ postId, onClose, fetchWithRetry, currentUserId }) => {
    const [comments, setComments] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchComments = useCallback(async () => {
        try {
            const res = await fetchWithRetry(`${API_URL}/feed/${postId}/comments`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) setComments(data.comments);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [postId, fetchWithRetry]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleSend = async () => {
        if (!text.trim()) return;
        try {
            const res = await fetchWithRetry(`${API_URL}/feed/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.trim() })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setComments(prev => [...prev, data.comment]);
                    setText('');
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col h-full anim-slide-up">
            <div className="bg-[#1a1a1a] flex-1 mt-20 rounded-t-3xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="font-bold text-lg">Комментарии</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">Закрыть</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="text-center text-gray-500">Загрузка...</div>
                    ) : comments.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">Нет комментариев</div>
                    ) : (
                        comments.map(c => (
                            <div key={c.id} className="flex gap-3">
                                {c.author_avatar ? (
                                    <img src={c.author_avatar} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                        <User className="w-4 h-4" />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">{c.author_name}</span>
                                        <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-200">{c.text}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-[#0d0d0d] border-t border-white/10 pb-8">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={text}
                            onChange={e => setText(e.target.value)}
                            className="flex-1 bg-[#1a1a1a] rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-blue-500"
                            placeholder="Написать комментарий..."
                        />
                        <button onClick={handleSend} disabled={!text.trim()} className="bg-blue-600 p-3 rounded-xl disabled:opacity-50">
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ... (CreatePostModal remains mostly same)


const CreatePostModal = ({ onClose, onPostCreated, fetchWithRetry, showToast }) => {
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim() && !imageUrl.trim()) return;

        setSubmitting(true);
        try {
            const res = await fetchWithRetry(`${API_URL}/feed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, imageUrl })
            });

            if (res.ok) {
                showToast('Пост опубликован!');
                onPostCreated();
            } else {
                showToast('Ошибка публикации', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Ошибка сети', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-[#1a1a1a] w-full max-w-md rounded-2xl border border-white/10 p-5 space-y-4">
                <h2 className="text-xl font-bold">Новый пост</h2>

                <textarea
                    className="w-full bg-black/20 rounded-xl p-3 outline-none text-white resize-none"
                    rows={4}
                    placeholder="О чем хотите рассказать?"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                />

                <input
                    type="text"
                    className="w-full bg-black/20 rounded-xl p-3 outline-none text-white text-sm"
                    placeholder="URL картинки (http://...)"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                />
                {imageUrl && (
                    <img src={imageUrl} className="w-20 h-20 rounded object-cover border border-white/10" />
                )}

                <div className="flex gap-2 pt-2">
                    <button onClick={onClose} className="flex-1 bg-gray-800 py-3 rounded-xl font-medium">Отмена</button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || (!content && !imageUrl)}
                        className="flex-1 bg-blue-600 disabled:opacity-50 py-3 rounded-xl font-medium"
                    >
                        {submitting ? 'Публикация...' : 'Опубликовать'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Feed;
