import { css } from '@emotion/react';
import { orderController } from '../../api';
import { Order } from '../../api/order-controller/types';
// @ts-ignore
import React from 'react';

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
  } = props;

  if (!orderNumber) return null;

  return (
    <div css={rowStyles}>
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

          {convenientSlot.map(() => (
            <div css={convenientSlotStyle}>
              <div css={titleStyles}>
                {slot?.dateFrom} - {slot?.dateTo}
              </div>
            </div>
          ))}
        </>
      ) : (
        <button>Указать возможный слот</button>
      )}
    </div>
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
  min-width: calc(50% - 4px)
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
