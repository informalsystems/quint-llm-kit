# UC digital signatures

## Intuition 

![f-sig](https://github.com/dfirsov/uc_model_checking/blob/main/specs/f_sig_ideal/f_sig_ideal.png?raw=true)

- **F-Sig intuition:** This functionality idealizes a public-key signature scheme. The simulators are “responsive” so that this functionality models non-interactive signature schemes. 

- **Gen:** This interface allows users to generate a key. The verification key is picked by the simulator. It is sanitized so that it is different to existing vk’s, including those for which a valid entry in Ver exists.

- **Sign:** This interface allows generating a signature on a given input message. The signature is sanitized so that it is always available (this is due to locality) and so that the signature was not marked as invalid previously. 

- **Verify:** This interface allows verifying signature under any verification key (we do not assume that verification keys are authenticated). This interface guarantee is that no new signature under an honestly generated key verifies (unless the party has been corrupted). This therefore models string unforgeability. 

- **Paper:** https://eprint.iacr.org/2024/1807 (page 18)

## Formal specification in Quint