import {
  Exception,
  LiquidityPosition, LPTransfer, MintBurnLog, UserLPTransaction,
  User,
  UserLiquidityPositionDayData
} from "../generated/schema";
import {Address, BigDecimal, BigInt, Bytes, ethereum, log} from "@graphprotocol/graph-ts/index";
import {ERC20} from "../generated/templates/SpiritPair/ERC20";

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const MINUS_ONE = BigInt.fromI32(-1);
export const BI_18 = BigInt.fromI32(18);
export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);


export function updateDayData(lp: LiquidityPosition, userAddress: Address, event: ethereum.Event): UserLiquidityPositionDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPairID = lp.id
    .concat('-')
    .concat(BigInt.fromI32(dayID).toString())
  let dayData = UserLiquidityPositionDayData.load(dayPairID)
  if (dayData === null) {
    dayData = new UserLiquidityPositionDayData(dayPairID)
    dayData.date = dayStartTimestamp
    dayData.poolProviderName = lp.poolProviderName
    dayData.poolProviderKey = lp.poolProviderKey
    dayData.poolAddress = lp.poolAddress
    dayData.userAddress = userAddress
  }

  dayData.balance = lp.balance
  dayData.balanceFromMintBurn = lp.balanceFromMintBurn
  dayData.save()

  return dayData as UserLiquidityPositionDayData
}

export function createException(addrs: Bytes, txHash: Bytes, message: string): void {
  let exception = new Exception(txHash.toHexString())
  exception.addrs = addrs
  exception.txHash = txHash
  exception.message = message
  exception.save()
}

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1');
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString('10'));
  }
  return bd;
}

export function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
  if (exchangeDecimals == ZERO_BI) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}

export function createOrUpdateLiquidityPosition(poolProviderKey: string, poolAddrs: Address, userAddrs: Address, addToMintBurnVal: BigInt): LiquidityPosition {
  let userId = userAddrs.toHexString()

  let user = User.load(userId)
  if (user == null) {
    user = new User(userId)
    user.save()
  }

  let id = poolAddrs
    .toHexString()
    .concat('-')
    .concat(userAddrs.toHexString())
  let lp = LiquidityPosition.load(id)
  if (lp === null) {
    log.warning('LiquidityPosition was not found, creating new one: {}', [id])
    lp = new LiquidityPosition(id)
    lp.poolAddress = poolAddrs
    lp.user = user.id
    lp.balanceFromMintBurn = ZERO_BI.toBigDecimal()
    lp.poolProviderKey = poolProviderKey
    lp.poolProviderName = getProviderName(poolProviderKey)
  }

  let mintBurnValToAdd = convertTokenToDecimal(addToMintBurnVal, BI_18);
  lp.balanceFromMintBurn = lp.balanceFromMintBurn.plus(mintBurnValToAdd);
  lp.balance = getBalanceOf(poolAddrs, userAddrs);
  lp.save()

  return lp as LiquidityPosition
}

function getProviderName(poolProviderKey: string): string {
  if (poolProviderKey == 'spookyswap_fantom') {
    return 'Spookyswap'
  } else if (poolProviderKey == 'spiritswap_fantom') {
    return 'Spiritswap'
  } else {
    throw 'Unknown pool provider key, please define it!'
  }
}

function getBalanceOf(poolAddrs: Address, userAddrs: Address): BigDecimal {
  return convertTokenToDecimal(ERC20.bind(poolAddrs).balanceOf(userAddrs), BI_18);
}

export function createMintBurnLog(event: ethereum.Event, userAddrs: Address, value: BigInt): void {
  let transactionHash = event.transaction.hash;
  let txHash = transactionHash.toHexString()
  let number = Date.now() as i64
  let id = txHash
    .concat('-')
    .concat(userAddrs.toHexString())
    .concat(number as string)
  let mintBurnLog = new MintBurnLog(id)
  mintBurnLog.userAddress = userAddrs
  mintBurnLog.poolAddress = event.address
  mintBurnLog.transactionHash = transactionHash
  mintBurnLog.blockNumber = event.block.number
  mintBurnLog.value = convertTokenToDecimal(value, BI_18)
  mintBurnLog.save()
}

export function createTransferEvent(event: ethereum.Event, userAddrs: Address, from: Bytes, to: Bytes, value: BigInt): void {
  let blockNum = event.block.number.toString()
  let id = blockNum
    .concat('-')
    .concat(event.address.toHexString())
    .concat('-')
    .concat(from.toHexString())
    .concat('-')
    .concat(to.toHexString())
    .concat('-')
    .concat(value.toString())

  let transfer = new LPTransfer(id)
  transfer.userAddress = userAddrs
  transfer.poolAddress = event.address
  transfer.transactionHash = event.transaction.hash
  transfer.blockNumber = event.block.number
  transfer.from = from
  transfer.to = to
  transfer.value = convertTokenToDecimal(value, BI_18)
  transfer.timestamp = event.block.timestamp
  transfer.save()
}

export function maybeCreateUserLpTransaction(event: ethereum.Event, userAddrs: Address, poolAddrs: Address): void {
  let id = userAddrs.toHexString()
    .concat('-')
    .concat(poolAddrs.toHexString())
    .concat('-')
    .concat(event.block.number.toString())

  if (UserLPTransaction.load(id) === null) {
    let transfer = new UserLPTransaction(id)
    transfer.userAddress = userAddrs
    transfer.poolAddress = poolAddrs
    transfer.transactionHash = event.transaction.hash
    transfer.blockNumber = event.block.number
    transfer.timestamp = event.block.timestamp
    transfer.save()
  }

}
