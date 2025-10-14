import { useState } from 'react';
import { ozonPersonalAccountController, subscriptionController, paymentController } from '../../api';
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

  // Подписка и платежи
  const { mutate: createSubscription, isPending: isCreatingSubscription } = subscriptionController.useCreateSubscription();
  const { data: subscriptionStatus } = subscriptionController.useGetSubscriptionStatus();
  const { mutate: createPayment, isPending: isCreatingPayment } = paymentController.useCreatePayment();
  
  // Состояние для модального окна оплаты
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<{ id: string; confirmation_url: string; amount: { value: string; currency: string }; description: string } | null>(null);

  const handleSubscribe = (planType: 'basic' | 'premium') => {
    createPayment(
      { plan_type: planType },
      {
        onSuccess: (data) => {
          console.log('Payment created:', data);
          setCurrentPayment({
            id: data.payment.id,
            confirmation_url: data.payment.confirmation.confirmation_url,
            amount: data.payment.amount,
            description: data.payment.description
          });
          setPaymentModalOpen(true);
        },
        onError: (error) => {
          alert('Ошибка при создании платежа. Пожалуйста, попробуйте еще раз.');
          console.error('Payment creation error:', error);
        }
      }
    );
  };

  const handlePaymentConfirm = () => {
    if (!currentPayment) return;
    
    // В реальном приложении здесь был бы вызов API для подтверждения платежа
    // Для демонстрации имитируем успешную оплату и создаем подписку
    createSubscription(
      { plan_type: currentPayment.description.includes('1 месяц') ? 'basic' : 'premium' },
      {
        onSuccess: (data) => {
          alert('Платеж успешно обработан! Подписка активирована.');
          console.log('Subscription created:', data);
          setPaymentModalOpen(false);
          setSubscriptionModalOpen(false);
          setCurrentPayment(null);
        },
        onError: (error) => {
          alert('Ошибка при активации подписки. Пожалуйста, обратитесь в поддержку.');
          console.error('Subscription creation error:', error);
        }
      }
    );
  };

  const handlePaymentCancel = () => {
    setPaymentModalOpen(false);
    setCurrentPayment(null);
  };

  // Форматирование количества проверок для отображения
  const formatChecks = (checks: number) => {
    if (checks === 0) return '0 проверок';
    if (checks === 1) return '1 проверка';
    if (checks >= 2 && checks <= 4) return `${checks} проверки`;
    return `${checks} проверок`;
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
          {subscriptionStatus?.has_subscription 
            ? `Осталось: ${formatChecks(subscriptionStatus.remaining_checks || 0)}`
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

      {/* Модальное окно оплаты */}
      {isPaymentModalOpen && currentPayment && (
        <Modal
          onClose={handlePaymentCancel}
          title="Оплата подписки"
        >
          <div css={paymentModalStyle}>
            <div css={paymentInfoStyle}>
              <h3 css={paymentTitleStyle}>{currentPayment.description}</h3>
              <div css={paymentAmountStyle}>
                Сумма: {currentPayment.amount.value} {currentPayment.amount.currency}
              </div>
              <div css={paymentInstructionsStyle}>
                {/* В реальном приложении здесь была бы интеграция с ЮКассой */}
                <p>Для завершения оплаты перейдите по ссылке:</p>
                <a 
                  href={currentPayment.confirmation_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  css={paymentLinkStyle}
                >
                  {currentPayment.confirmation_url}
                </a>
                <p css={paymentNoteStyle}>
                  После успешной оплаты нажмите кнопку "Подтвердить оплату"
                </p>
              </div>
            </div>
            
            <div css={paymentButtonsStyle}>
              <button 
                css={confirmButtonStyle}
                onClick={handlePaymentConfirm}
                disabled={isCreatingSubscription}
              >
                {isCreatingSubscription ? 'Активация...' : 'Подтвердить оплату'}
              </button>
              <button 
                css={cancelButtonStyle}
                onClick={handlePaymentCancel}
              >
                Отмена
              </button>
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

// Стили для модального окна оплаты
const paymentModalStyle = css`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const paymentInfoStyle = css`
  text-align: center;
`;

const paymentTitleStyle = css`
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
`;

const paymentAmountStyle = css`
  font-size: 16px;
  font-weight: 600;
  color: #007bff;
  margin-bottom: 15px;
`;

const paymentInstructionsStyle = css`
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
`;

const paymentLinkStyle = css`
  color: #007bff;
  text-decoration: none;
  word-break: break-all;
  display: block;
  margin: 10px 0;
  padding: 8px;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  
  &:hover {
    text-decoration: underline;
    background-color: #f8f9fa;
  }
`;

const paymentNoteStyle = css`
  font-size: 14px;
  color: #6c757d;
  margin: 10px 0 0 0;
`;

const paymentButtonsStyle = css`
  display: flex;
  gap: 10px;
  justify-content: center;
`;

const confirmButtonStyle = css`
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  
  &:hover {
    background-color: #218838;
  }
`;

const cancelButtonStyle = css`
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #5a6268;
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
