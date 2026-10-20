import { PrismaExchangeRateRepository } from './prisma-exchange-rate.repository';

describe('PrismaExchangeRateRepository', () => {
  const prisma = {
    exchangeRate: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
  };

  let repository: PrismaExchangeRateRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PrismaExchangeRateRepository(prisma as never);
  });

  describe('findOnDate', () => {
    it('should query by the compound key using a UTC date and return the rate as a number', async () => {
      prisma.exchangeRate.findUnique.mockResolvedValue({
        rate: { toString: () => '23.5' },
        rateDate: new Date('2026-03-10T00:00:00.000Z'),
      });

      const result = await repository.findOnDate('MYR', 'INR', '2026-03-10');

      expect(prisma.exchangeRate.findUnique).toHaveBeenCalledWith({
        where: {
          fromCurrency_toCurrency_rateDate: {
            fromCurrency: 'MYR',
            toCurrency: 'INR',
            rateDate: new Date('2026-03-10T00:00:00.000Z'),
          },
        },
      });
      expect(result).toEqual({ rate: 23.5, rateDate: '2026-03-10' });
    });

    it('should return null when no rate is stored for the date', async () => {
      prisma.exchangeRate.findUnique.mockResolvedValue(null);

      await expect(
        repository.findOnDate('MYR', 'INR', '2026-03-10'),
      ).resolves.toBeNull();
    });
  });

  describe('findLatestOnOrBefore', () => {
    it('should return the most recent stored rate on or before the date', async () => {
      prisma.exchangeRate.findFirst.mockResolvedValue({
        rate: 22.9,
        rateDate: new Date('2026-03-05T00:00:00.000Z'),
      });

      const result = await repository.findLatestOnOrBefore(
        'MYR',
        'INR',
        '2026-03-10',
      );

      expect(prisma.exchangeRate.findFirst).toHaveBeenCalledWith({
        where: {
          fromCurrency: 'MYR',
          toCurrency: 'INR',
          rateDate: { lte: new Date('2026-03-10T00:00:00.000Z') },
        },
        orderBy: { rateDate: 'desc' },
      });
      expect(result).toEqual({ rate: 22.9, rateDate: '2026-03-05' });
    });

    it('should return null when nothing is stored yet', async () => {
      prisma.exchangeRate.findFirst.mockResolvedValue(null);

      await expect(
        repository.findLatestOnOrBefore('MYR', 'INR', '2026-03-10'),
      ).resolves.toBeNull();
    });
  });

  describe('save', () => {
    it('should upsert the rate on the compound key', async () => {
      prisma.exchangeRate.upsert.mockResolvedValue({});

      await repository.save({
        fromCurrency: 'MYR',
        toCurrency: 'INR',
        rateDate: '2026-03-10',
        rate: 23.5,
      });

      expect(prisma.exchangeRate.upsert).toHaveBeenCalledWith({
        where: {
          fromCurrency_toCurrency_rateDate: {
            fromCurrency: 'MYR',
            toCurrency: 'INR',
            rateDate: new Date('2026-03-10T00:00:00.000Z'),
          },
        },
        update: { rate: 23.5, fetchedAt: expect.any(Date) },
        create: {
          fromCurrency: 'MYR',
          toCurrency: 'INR',
          rateDate: new Date('2026-03-10T00:00:00.000Z'),
          rate: 23.5,
          fetchedAt: expect.any(Date),
        },
      });
    });
  });
});
