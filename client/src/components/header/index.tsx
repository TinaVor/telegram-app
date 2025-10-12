import { useState } from 'react';
import { ozonPersonalAccountController } from '../../api';
import { Modal } from '../modal';
import { css } from '@emotion/react';

export const Header = () => {
  const [isModalOpen, setOpenModal] = useState(false);

  const { data } = ozonPersonalAccountController.useGetAccounts();

  const { mutate: deleteKey, isPending } =
    ozonPersonalAccountController.useDeleteAccount();
  const { mutate: createKey, isPending: isCreating } =
    ozonPersonalAccountController.useCreateAccount();

  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');

  return (
    <div>
      <button onClick={() => setOpenModal(true)}>
        Проверить привязанные ключи
      </button>
      {isModalOpen && (
        <Modal
          onClose={() => setOpenModal(false)}
          title="Мои ключи от OZON кабинета"
        >
          {data?.map((i) => (
            <article css={keyContainerStyle}>
              <div css={keyTitleStyle}>Client_Id</div>
              <div css={keySubtitleStyle}>{i.client_id}</div>
              <div css={keyTitleStyle}>Api_Key</div>
              <div css={keySubtitleStyle}>{i.api_key}</div>
              <button onClick={() => deleteKey(i.id)} disabled={isPending}>
                Удалить ключ
              </button>
            </article>
          ))}

          <div css={createKeySectionStyle}>
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={isCreating}
            />
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isCreating}
            />
            <button
              onClick={() => {
                createKey({
                  client_id: clientId,
                  api_key: apiKey,
                });
                setClientId('');
                setApiKey('');
              }}
              disabled={isCreating || !clientId || !apiKey}
            >
              Создать ключ
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const keyContainerStyle = css`
  margin-top: 10px;
  border-bottom: 1px solid black;
  padding-bottom: 10px;
`;
const keyTitleStyle = css`
  font-size: 13px;
  opacity: 0.75;
`;

const keySubtitleStyle = css`
  font-size: 16px;
  margin-bottom: 5px;
  margin-bottom: 5px;
`;
const createKeySectionStyle = css`
  margin-top: 10px;
`;
