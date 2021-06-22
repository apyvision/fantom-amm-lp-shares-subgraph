import {
  LiquidityPosition,
  User,
  UserLPTransaction
} from "../generated/schema";
import {Address, BigDecimal, BigInt, Bytes, ethereum, log} from "@graphprotocol/graph-ts/index";

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const MINUS_ONE = BigInt.fromI32(-1);
export const BI_18 = BigInt.fromI32(18);
export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);

function getProviderName(poolProviderKey: string): string {
  if (poolProviderKey == 'spookyswap_fantom') {
    return 'Spookyswap'
  } else if (poolProviderKey == 'spiritswap_fantom') {
    return 'Spiritswap'
  } else {
    throw 'Unknown pool provider key, please define it!'
  }
}


export function maybeCreateUserLpTransaction(event: ethereum.Event, userAddrs: Address, poolAddrs: Address): void {
  let userId = userAddrs.toHexString()

  let user = User.load(userId)
  if (user == null) {
    user = new User(userId)
    user.save()
  }

  let id = userAddrs.toHexString()
    .concat('-')
    .concat(poolAddrs.toHexString())
    .concat('-')
    .concat(event.block.number.toString())

  if (UserLPTransaction.load(id) === null) {
    let transfer = new UserLPTransaction(id)
    transfer.user = user.id
    transfer.poolAddress = poolAddrs
    transfer.transactionHash = event.transaction.hash
    transfer.blockNumber = event.block.number
    transfer.timestamp = event.block.timestamp
    transfer.save()
  }

}

export function maybeCreateUserLiquidityPosition(userAddrs: Address, poolAddrs: Address, poolProviderKey: string): void {
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
    lp.poolProviderKey = poolProviderKey
    lp.poolProviderName = getProviderName(poolProviderKey)
    lp.save()
  }
}
