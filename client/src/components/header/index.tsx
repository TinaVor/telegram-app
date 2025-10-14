import { useState } from 'react';
import { ozonPersonalAccountController, subscriptionController } from '../../api';
import { Modal } from '../modal';
import { css } from '@emotion/react';

export const Header = () => {
  const [isModalOpen, setOpenModal] = useState(false);
  const [isSubscriptionModalOpen, setSubscriptionModalOpen] = useState(false);

  const { data } = ozonPersonalAccountController.useGetAccounts();

  const { mutate: deleteKey, isPending } =
    ozonPersonalAccountController.useDeleteAccount();
  const { mutate: createKey, isPending: isCreating } =
    ozonPersonalAccountController.useCreateAccount();

  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');

  // Подписка
  const { mutate: createSubscription, isPending: isCreatingSubscription } = subscriptionController.useCreateSubscription();
  const { data: subscriptionStatus } = subscriptionController.useGetSubscriptionStatus();

  const handleSubscribe = (planType: 'basic' | 'premium') => {
    createSubscription(
      { plan_type: planType },
      {
        onSuccess: (data) => {
          alert('Подписка успешно активирована!');
          console.log('Subscription created:', data);
          setSubscriptionModalOpen(false);
        },
        onError: (error) => {
          alert('Ошибка при активации подписки. Пожалуйста, попробуйте еще раз.');
          console.error('Subscription creation error:', error);
        }
      }
    );
  };

  // Форматирование даты для отображения
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div css={headerContainerStyle}>
      <button onClick={() => setOpenModal(true)}>
        Проверить привязанные ключи
      </button>
      <div css={subscriptionSectionStyle}>
        <button onClick={() => setSubscriptionModalOpen(true)} css={subscriptionButtonStyle}>
          Подписка
        </button>
        <div css={subscriptionStatusStyle}>
          {subscriptionStatus?.has_subscription && subscriptionStatus.expired_date 
            ? `Активна до: ${formatDate(subscriptionStatus.expired_date)}`
            : 'Нет подписки'}
        </div>
      </div>
      {isModalOpen && (
        <Modal
          onClose={() => setOpenModal(false)}
          title="Мои ключи от OZON кабинета"
        >
          {data?.map((i) => (
            <article css={keyContainerStyle} key={i.api_key}>
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
      {isSubscriptionModalOpen && (
        <Modal
          onClose={() => setSubscriptionModalOpen(false)}
          title="Оформление подписки"
        >
          <div css={subscriptionFormStyle}>
            <div css={planSectionStyle}>
              <h3 css={sectionTitleStyle}>Выберите тариф</h3>
              <div css={plansContainerStyle}>
                <div css={planCardStyle}>
                  <h4 css={planTitleStyle}>1 месяц</h4>
                  <div css={planPriceStyle}>5000 ₽</div>
                  <ul css={planFeaturesStyle}>
                    <li>Доступ на 1 месяц</li>
                    <li>Базовая аналитика</li>
                    <li>Email поддержка</li>
                  </ul>
                  <button 
                    css={selectPlanButtonStyle}
                    onClick={() => handleSubscribe('basic')}
                    disabled={isCreatingSubscription}
                  >
                    {isCreatingSubscription ? 'Активация...' : 'Активировать'}
                  </button>
                </div>
                
                <div css={planCardStyle}>
                  <h4 css={planTitleStyle}>3 месяца</h4>
                  <div css={planPriceStyle}>12000 ₽</div>
                  <ul css={planFeaturesStyle}>
                    <li>Доступ на 3 месяца</li>
                    <li>Расширенная аналитика</li>
                    <li>Приоритетная поддержка</li>
                    <li>Автоматизация отчетов</li>
                  </ul>
                  <button 
                    css={selectPlanButtonStyle}
                    onClick={() => handleSubscribe('premium')}
                    disabled={isCreatingSubscription}
                  >
                    {isCreatingSubscription ? 'Активация...' : 'Активировать'}
                  </button>
                </div>
              </div>
            </div>

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

const headerContainerStyle = css`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const subscriptionSectionStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const subscriptionStatusStyle = css`
  font-size: 12px;
  color: #666;
  font-weight: 500;
`;

const subscriptionButtonStyle = css`
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #0056b3;
  }
`;

const subscriptionFormStyle = css`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 5px;

  /* Стили для скроллбара */
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;

const planSectionStyle = css`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const sectionTitleStyle = css`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
`;

const plansContainerStyle = css`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  
  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const planCardStyle = css`
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  flex: 1;
  min-width: 150px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  
  @media (max-width: 480px) {
    min-width: auto;
  }
`;

const planTitleStyle = css`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
`;

const planPriceStyle = css`
  font-size: 18px;
  font-weight: 700;
  color: #007bff;
`;

const planFeaturesStyle = css`
  margin: 0;
  padding-left: 15px;
  font-size: 14px;
  color: #666;
  flex-grow: 1;
  
  li {
    margin-bottom: 5px;
  }
`;

const selectPlanButtonStyle = css`
  background-color: #28a745;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #218838;
  }
`;

const paymentSectionStyle = css`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const paymentFormStyle = css`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const inputStyle = css`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
`;

const smallInputStyle = css`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  flex: 1;
`;

const cardDetailsStyle = css`
  display: flex;
  gap: 10px;
`;

const payButtonStyle = css`
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  
  &:hover {
    background-color: #0056b3;
  }
`;


const inputErrorStyle = css`
  border-color: #dc3545 !important;
  background-color: #fff5f5;
`;

const errorTextStyle = css`
  color: #dc3545;
  font-size: 12px;
  margin-top: 4px;
`;

const inputGroupStyle = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`;
