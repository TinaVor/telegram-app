const express = require('express');

const router = express.Router();

router.get('/', async (req, res) => {
  res.jsonp([
    {
      id: '21412512ewse',
      orderId: '21412325-1',
      slot: {
        dateFrom: '12/07/2025T10:10:10.12934',
        dateTo: '12/08/2025T10:10:10.12934',
      },
      supplyNumber: '9174',
      clusterNme: 'Москва, Центр',
      stockName: 'ПВЗ ООО Ромашка',
      status: 'Заполнение данных',
      convenientSlot: [
        {
          dateFrom: '12/07/2025T10:10:10.12934',
          dateTo: '12/08/2025T10:10:10.12934',
        },
        {
          dateFrom: '12/07/2025T10:10:10.12934',
          dateTo: '12/08/2025T10:10:10.12934',
        },
      ],
    },
    {
      id: '21412512ewss',
      orderId: '21412325-2',
      slot: {
        dateFrom: '12/07/2025T10:10:10.12934',
        dateTo: '12/08/2025T10:10:10.12934',
      },
      supplyNumber: '914574',
      clusterNme: 'Москва, Запад',
      stockName: 'ПВЗ ООО Одуванчики',
      status: 'Заполнение данных',
      convenientSlot: [
        {
          dateFrom: '12/07/2025T10:10:10.12934',
          dateTo: '12/08/2025T10:10:10.12934',
        },
        {
          dateFrom: '12/07/2025T10:10:10.12934',
          dateTo: '12/08/2025T10:10:10.12934',
        },
      ],
    },
  ]);
});

module.exports = router;
