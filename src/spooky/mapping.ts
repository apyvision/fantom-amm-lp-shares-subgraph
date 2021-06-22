/* eslint-disable prefer-const */
import {
  maybeCreateUserLiquidityPosition, maybeCreateUserLpTransaction,
} from "../util";
import {Transfer} from "../../generated/templates/SpookyPair/Pair";

let PROVIDER_KEY = "spookyswap_fantom";

export function handleTransfer(event: Transfer): void {
  let poolAddress = event.address;

  // this is who executed the txn, it can be diff than the from address
  let initiator = event.transaction.from;

  maybeCreateUserLiquidityPosition(initiator, poolAddress, PROVIDER_KEY)
  maybeCreateUserLpTransaction(event, initiator, poolAddress)

}

