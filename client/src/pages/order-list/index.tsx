import { css } from '@emotion/react';
import { orderController, subscriptionController, paymentController } from '../../api';
import { Order } from '../../api/order-controller/types';
import React, { useState } from 'react';
import { Modal } from '../../components/modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Функция для проверки пересечения слотов
const checkSlotOverlap = (slots: Array<{ dateFrom: Date | null; dateTo: Date | null }>) => {
  const validSlots = slots.filter(slot => slot.dateFrom && slot.dateTo);

  for (let i = 0; i < validSlots.length; i++) {
    for (let j = i + 1; j < validSlots.length; j++) {
      const slot1 = validSlots[i];
      const slot2 = validSlots[j];

      const start1 = slot1.dateFrom!.getTime();
      const end1 = slot1.dateTo!.getTime();
      const start2 = slot2.dateFrom!.getTime();
      const end2 = slot2.dateTo!.getTime();

      // Проверяем пересечение: если слоты пересекаются, возвращаем true
      // Пересечение происходит если начало одного слота находится внутри другого
      if ((start1 < end2 && end1 > start2) || (start2 < end1 && end2 > start1)) {
        return true;
      }
    }
  }
  return false;
};

export const OrderListPage = () => {
  const { data, isLoading, error } = orderController.useGetUserOrders();
  const [isSubscriptionModalOpen, setSubscriptionModalOpen] = useState(false);

  // Подписка и платежи
  const { mutate: createPayment, isPending: isCreatingPayment } = paymentController.useCreatePayment();
  const { data: subscriptionStatus } = subscriptionController.useGetSubscriptionStatus();
  
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
          setSubscriptionModalOpen(false);
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
    alert('Платеж успешно обработан! Подписка активирована.');
    setPaymentModalOpen(false);
    setCurrentPayment(null);
  };

  const handlePaymentCancel = () => {
    setPaymentModalOpen(false);
    setCurrentPayment(null);
  };

  // Форматирование количества слотов для отображения
  const formatSlots = (slots: number) => {
    if (slots === 0) return '0 слотов';
    if (slots === 1) return '1 слот';
    if (slots >= 2 && slots <= 4) return `${slots} слота`;
    return `${slots} слотов`;
  };

  if (isLoading) return 'Загрузка...';

  if (error) return 'Произошла ошибка :(';

  return (
    <div css={containerStyles}>
      {/* Кнопка подписки */}
      <div css={subscriptionButtonContainerStyle}>
        <button 
          onClick={() => setSubscriptionModalOpen(true)} 
          css={mainSubscriptionButtonStyle}
        >
          Купить подписку
        </button>
        <div css={subscriptionStatusTextStyle}>
          {subscriptionStatus?.has_subscription 
            ? `Осталось: ${formatSlots(subscriptionStatus.remaining_slots || 0)}`
            : 'Нет подписки'}
        </div>
      </div>

      <div css={scrollableContainerStyles}>
        {data?.map((order) => (
          <OrderRow key={order.id} {...order} />
        ))}
      </div>

      {/* Модальное окно подписки */}
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
                  <h4 css={planTitleStyle}>30 слотов</h4>
                  <div css={planPriceStyle}>300 ₽</div>
                  <ul css={planFeaturesStyle}>
                    <li>30 слотов для заказов</li>
                    <li>Базовая аналитика</li>
                    <li>Email поддержка</li>
                  </ul>
                  <button 
                    css={selectPlanButtonStyle}
                    onClick={() => handleSubscribe('basic')}
                    disabled={isCreatingPayment}
                  >
                    {isCreatingPayment ? 'Создание...' : 'Оплатить'}
                  </button>
                </div>
                
                <div css={planCardStyle}>
                  <h4 css={planTitleStyle}>90 слотов</h4>
                  <div css={planPriceStyle}>800 ₽</div>
                  <ul css={planFeaturesStyle}>
                    <li>90 слотов для заказов</li>
                    <li>Расширенная аналитика</li>
                    <li>Приоритетная поддержка</li>
                    <li>Автоматизация отчетов</li>
                  </ul>
                  <button 
                    css={selectPlanButtonStyle}
                    onClick={() => handleSubscribe('premium')}
                    disabled={isCreatingPayment}
                  >
                    {isCreatingPayment ? 'Создание...' : 'Оплатить'}
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
              >
                Подтвердить оплату
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

export const OrderRow = (props: Order) => {
  const {
    orderId,
    orderNumber,
    slot,
    clusterName,
    stockName,
    convenientSlot,
    isSlotFixed,
  } = props;
  const [isModalOpen, setModalOpen] = useState<boolean>(false);

  if (!orderNumber) return null;

  return (
    <div css={[rowStyles, isSlotFixed ? greenBorderStyles : redBorderStyles]}>
      <div css={flexStyles}>
        <div css={flexColStyles}>
          <div css={subtitleStyles}>Номер заявки</div>
          <div css={titleStyles}>{orderId}</div>
        </div>
        <div css={flexColStyles}>
          <div css={subtitleStyles}>Номер поставки</div>
          <div css={titleStyles}>{orderNumber}</div>
        </div>
      </div>

      <div css={flexStyles}>
        <div css={flexColStyles}>
          <div css={subtitleStyles}>Кластер</div>
          <div css={titleStyles}>{clusterName || '-'}</div>
        </div>
        <div css={flexColStyles}>
          <div css={subtitleStyles}>Склад</div>
          <div css={titleStyles}>{stockName || '-'}</div>
        </div>
      </div>

      <div css={flexStyles}>
        <div css={flexColStyles}>
          <div css={subtitleStyles}>Дата поставки</div>
          <div css={titleStyles}>
            {slot?.dateFrom} - {slot?.dateTo}
          </div>
        </div>
        <div css={flexColStyles}>
          <div css={subtitleStyles}>Статус</div>
          <div css={titleStyles}>ЗДЕСЬ СТАТУС ПОСТАВКИ</div>
        </div>
      </div>

      {convenientSlot.length > 0 ? (
        <>
          <div css={subtitleStyles}>Удобный(-ые) таймслот(-ы)</div>

          {convenientSlot.map((slot, index) => (
            <div key={index} css={convenientSlotStyle}>
              <div css={titleStyles}>
                {slot.dateFrom} - {slot.dateTo}
              </div>
            </div>
          ))}
          <button onClick={() => setModalOpen(true)}>Добавить/редактировать слот</button>
        </>
      ) : (
        <button onClick={() => setModalOpen(true)}>Указать возможный слот</button>
      )}
      <SlotModal orderId={orderId} convenientSlot={convenientSlot} isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};

const SlotModal = ({ orderId, convenientSlot, isOpen, onClose }: { orderId: string; convenientSlot: { dateFrom: string; dateTo: string }[]; isOpen: boolean; onClose: () => void }) => {
  const [slots, setSlots] = useState<Array<{ dateFrom: Date | null; dateTo: Date | null }>>(convenientSlot.map(slot => ({
    dateFrom: slot.dateFrom ? new Date(slot.dateFrom) : null,
    dateTo: slot.dateTo ? new Date(slot.dateTo) : null
  })));

  React.useEffect(() => {
    if (isOpen) {
      setSlots(convenientSlot.map(slot => ({
        dateFrom: slot.dateFrom ? new Date(slot.dateFrom) : null,
        dateTo: slot.dateTo ? new Date(slot.dateTo) : null
      })));
    }
  }, [isOpen, convenientSlot]);

  const mutateSlot = orderController.useBookSlot();

  const addSlot = () => {
    if (slots.length >= 3) return; // Maximum 3 slots
    setSlots([...slots, { dateFrom: null, dateTo: null }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: 'dateFrom' | 'dateTo', date: Date | null) => {
    const newSlots = [...slots];
    const minutes = 0; // Always set minutes to 0

    if (date) {
      date.setMinutes(minutes);
      date.setSeconds(0);
      date.setMilliseconds(0);

      // Максимум 3 часа (180 минут) между dateFrom и dateTo
      if (field === 'dateTo' && newSlots[index].dateFrom) {
        const duration = date.getTime() - newSlots[index].dateFrom.getTime();
        const maxDuration = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

        if (duration > maxDuration) {
          // Если длительность больше 3 часов, автоматически устанавливаем dateTo = dateFrom + 3 часа
          const newDateTo = new Date(newSlots[index].dateFrom.getTime() + maxDuration);
          newDateTo.setMinutes(0);
          newDateTo.setSeconds(0);
          newDateTo.setMilliseconds(0);
          newSlots[index][field] = newDateTo;
          setSlots(newSlots);
          return;
        }
      }

      // Проверка на корректность: dateFrom всегда должен быть раньше dateTo
      if (field === 'dateFrom') {
        // Если есть dateTo и dateFrom оказывается после dateTo, сбрасываем dateTo
        if (newSlots[index].dateTo && date.getTime() >= newSlots[index].dateTo.getTime()) {
          newSlots[index].dateTo = null; // Очищаем dateTo, он будет disabled
        }
      } else if (field === 'dateTo' && newSlots[index].dateFrom) {
        // Если dateTo оказывается раньше или-equal чем dateFrom, не можем выбрать
        if (date.getTime() <= newSlots[index].dateFrom.getTime()) {
          // Не устанавливаем значение, picker останется disabled
          return;
        }
      }

      // Проверка на пересечения с другими слотами при установке dateTo или dateFrom
      if (field === 'dateTo' || field === 'dateFrom') {
        newSlots[index][field] = date;
        const hasOverlap = checkSlotOverlap(newSlots);
        if (hasOverlap) {
          // Не апдейтим state если есть пересечение
          alert('Слоты не могут пересекаться во времени!');
          return;
        }
      }
    }

    newSlots[index][field] = date;
    setSlots(newSlots);
  };

  const handleSave = () => {
    // Validate slots
    const serverSlots = slots.filter(slot => slot.dateFrom && slot.dateTo).map(slot => {
      const dateFromUTC = slot.dateFrom ? new Date(slot.dateFrom.getTime() - slot.dateFrom.getTimezoneOffset() * 60000) : null;
      const dateToUTC = slot.dateTo ? new Date(slot.dateTo.getTime() - slot.dateTo.getTimezoneOffset() * 60000) : null;

      return {
        dateFrom: dateFromUTC ? dateFromUTC.toISOString().slice(0, 16) : '',
        dateTo: dateToUTC ? dateToUTC.toISOString().slice(0, 16) : ''
      };
    });

    mutateSlot.mutate({ orderId, slots: serverSlots }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  if (!isOpen) return null;

  return (
    <Modal title="Выберите удобный слот" onClose={onClose}>
      <div css={modalContentStyle}>
        {slots.map((slot, index) => (
          <div key={index} css={slotRowStyle}>
            <div css={pickerContainerStyle}>
              <label>От:</label>
              <div css={datePickerComponentStyle}>
                <DatePicker
                  selected={slot.dateFrom}
                  onChange={(date) => updateSlot(index, 'dateFrom', date)}
                  minDate={new Date()}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={60}
                  dateFormat="dd/MM/yyyy HH:mm"
                  placeholderText="Выберите дату и время"
                />
              </div>
            </div>
            <div css={pickerContainerStyle}>
              <label>До:</label>
              <div css={datePickerComponentStyle}>
                <DatePicker
                  selected={slot.dateTo}
                  onChange={(date) => updateSlot(index, 'dateTo', date)}
                  minDate={slot.dateFrom || new Date()}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={60}
                  dateFormat="dd/MM/yyyy HH:mm"
                  placeholderText="Выберите дату и время"
                />
              </div>
            </div>
            <button onClick={() => removeSlot(index)}>Удалить</button>
          </div>
        ))}
        {slots.length < 3 && (
          <button onClick={addSlot}>Добавить слот</button>
        )}
        <div css={buttonContainerStyle}>
          <button onClick={handleSave} disabled={mutateSlot.isPending}>Сохранить</button>
          <button onClick={onClose}>Отмена</button>
        </div>
      </div>
    </Modal>
  );
};

const containerStyles = css`
  background-color: #333;
  border: 1px solid #999;
  color: white;
  padding: 20px;
  border-radius: 10px;
  max-width: 100%;
  margin: 0 auto;
`;

const rowStyles = css`
  color: white;
  max-width: 768px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const scrollableContainerStyles = css`
  overflow: auto;
  max-width: 100%;
`;

const flexStyles = css`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
`;

const flexColStyles = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: calc(50% - 4px);
  max-width: calc(50% - 4px);
  width: calc(50% - 4px);
`;

const subtitleStyles = css`
  font-size: 13px;
  opacity: 0.8;
`;

const titleStyles = css`
  font-size: 16px;
`;

const convenientSlotStyle = css`
  margin-bottom: 4px;
  border-bottom: 1px solid green;
  padding-bottom: 4px;
`;

const modalContentStyle = css`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const slotRowStyle = css`
  display: flex;
  gap: 10px;
`;


const buttonContainerStyle = css`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

const pickerContainerStyle = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`;

const datePickerComponentStyle = css`
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
`;

const greenBorderStyles = css`
  border: 2px solid green;
  border-radius: 8px;
  padding: 10px;
`;

const redBorderStyles = css`
  border: 2px solid red;
  border-radius: 8px;
  padding: 10px;
`;

// Стили для компонента подписки
const subscriptionButtonContainerStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #444;
  border-radius: 8px;
`;

const mainSubscriptionButtonStyle = css`
  background-color: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  
  &:hover {
    background-color: #0056b3;
  }
`;

const subscriptionStatusTextStyle = css`
  font-size: 14px;
  color: #ccc;
  font-weight: 500;
`;

const subscriptionFormStyle = css`
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  text-align: center;
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
  text-align: center;
`;

const planPriceStyle = css`
  font-size: 18px;
  font-weight: 700;
  color: #007bff;
  text-align: center;
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
