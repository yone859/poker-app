import { useTranslation } from 'react-i18next';

interface Props {
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** ブラウザ標準の confirm の代わり。Expo版でも同じ見た目にするため自前で作る */
export function ConfirmDialog({ message, confirmLabel, danger, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  return (
    <div className="modal-backdrop center" onClick={onCancel}>
      <div className="dialog" role="alertdialog" onClick={(e) => e.stopPropagation()}>
        <p className="dialog-message">{message}</p>
        <div className="row gap">
          <button className="grow" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button className={`grow ${danger ? 'danger-fill' : 'primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
