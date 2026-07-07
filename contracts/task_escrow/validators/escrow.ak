// AgentBazaar TaskEscrow — IndiaCodex 2026
// Aiken v1.1.x / stdlib v2
//
// Aiken owns money. Masumi owns agent identity. No overlap.
//
// operator = backend signer key, fixed at compile time via parameterization.
// CompleteTask: operator signs + ADA paid to agent address.
// RefundPoster: poster signs to reclaim funds.

use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/address.{VerificationKey}
use cardano/assets
use cardano/transaction.{Output, OutputReference, Transaction}

pub type Datum {
  task_id: ByteArray,
  poster: VerificationKeyHash,
  agent: VerificationKeyHash,
  amount: Int,
}

pub type Redeemer {
  CompleteTask
  RefundPoster
}

fn paid_at_least(self: Transaction, pkh: VerificationKeyHash, amount: Int) -> Bool {
  list.any(
    self.outputs,
    fn(o: Output) {
      when o.address.payment_credential is {
        VerificationKey(h) -> h == pkh && assets.lovelace_of(o.value) >= amount
        _ -> False
      }
    },
  )
}

validator task_escrow(operator: VerificationKeyHash) {
  spend(
    datum: Option<Datum>,
    redeemer: Redeemer,
    _ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(d) = datum
    when redeemer is {
      CompleteTask ->
        list.has(self.extra_signatories, operator) && paid_at_least(
          self,
          d.agent,
          d.amount,
        )
      RefundPoster -> list.has(self.extra_signatories, d.poster)
    }
  }

  else(_) {
    fail
  }
}
