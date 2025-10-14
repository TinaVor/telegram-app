import { css } from '@emotion/react';
import { orderController } from '../../api';
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

  if (isLoading) return 'Загрузка...';

  if (error) return 'Произошла ошибка :(';

  return (
    <div css={containerStyles}>
      <div css={scrollableContainerStyles}>
        {data?.map((order) => (
          <OrderRow key={order.id} {...order} />
        ))}
      </div>
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
