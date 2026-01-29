import React from 'react';

const ConfirmationModal = React.memo(({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    isDanger = true
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl transform scale-100 transition-all">
                <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
                <p className="text-gray-300 mb-6 whitespace-pre-wrap text-sm leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-3 rounded-xl text-white font-bold transition-colors shadow-lg ${isDanger
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                : 'bg-green-500 hover:bg-green-600 shadow-green-500/20'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
});

ConfirmationModal.displayName = 'ConfirmationModal';

export default ConfirmationModal;
