import { Transaction } from '../../domain/entities/transaction.entity';
import { TransferPair } from '../../application/outputs/transfer-pair.output';
import {
  TransferLegResponseDto,
  TransferResponseDto,
} from '../dto/transfer-response.dto';
import { TransactionResponseMapper } from './transaction-response.mapper';

export class TransferResponseMapper {
  static toDto(pair: TransferPair): TransferResponseDto {
    return {
      transferGroupId: pair.transferGroupId,
      outLeg: TransferResponseMapper.toLegDto(pair.outLeg),
      inLeg: TransferResponseMapper.toLegDto(pair.inLeg),
    };
  }

  private static toLegDto(leg: Transaction): TransferLegResponseDto {
    return {
      ...TransactionResponseMapper.toDto(leg),
      transferGroupId: leg.transferGroupId ?? '',
      transferExchangeRate: leg.transferExchangeRate,
      transferRateSource: leg.transferRateSource,
    };
  }
}
