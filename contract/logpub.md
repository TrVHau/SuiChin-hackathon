dau@DESKTOP-DAU2K5:/mnt/c/code/blockchain/SuiChin-hackathon/contract$ sui client test-publish --build-env testnet
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING suichin
warning[W10007]: issue with attribute value
┌─ ./sources/marketplace.move:105:18
│
105 │ #[allow(lint(self_transfer))]
│ ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
┌─ ./sources/marketplace.move:145:18
│
145 │ #[allow(lint(self_transfer))]
│ ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
┌─ ./sources/trade_up.move:75:18
│
75 │ #[allow(lint(self_transfer))]
│ ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
┌─ ./sources/trade_up.move:119:18
│
119 │ #[allow(lint(self_transfer))]
│ ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
┌─ ./sources/craft.move:129:18
│
129 │ #[allow(lint(self_transfer))]
│ ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
┌─ ./sources/craft.move:194:18
│
194 │ #[allow(lint(self_transfer))]
│ ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

Transaction Digest: 8AP4hMhCgNwZLMomRzRniaF9mvqw7aBq9SFsYTcFSCho
╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Data │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ Gas Owner: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ Gas Budget: 125719200 MIST │
│ Gas Price: 1000 MIST │
│ Gas Payment: │
│ ┌── │
│ │ ID: 0x74a902976cdef6e2c9a7860a5a95db898417686904428cea856e184fc9ffefd5 │
│ │ Version: 3 │
│ │ Digest: 6ho2E8iH7CwDZ8NCoFYGtC9Jqcm8fSfHpQxSboBMZX4q │
│ └── │
│ │
│ Transaction Kind: Programmable │
│ ╭──────────────────────────────────────────────────────────────────────────────────────────────────────────╮ │
│ │ Input Objects │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ 0 Pure Arg: Type: address, Value: "0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027" │ │
│ ╰──────────────────────────────────────────────────────────────────────────────────────────────────────────╯ │
│ ╭─────────────────────────────────────────────────────────────────────────╮ │
│ │ Commands │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ 0 Publish: │ │
│ │ ┌ │ │
│ │ │ Dependencies: │ │
│ │ │ 0x0000000000000000000000000000000000000000000000000000000000000001 │ │
│ │ │ 0x0000000000000000000000000000000000000000000000000000000000000002 │ │
│ │ └ │ │
│ │ │ │
│ │ 1 TransferObjects: │ │
│ │ ┌ │ │
│ │ │ Arguments: │ │
│ │ │ Result 0 │ │
│ │ │ Address: Input 0 │ │
│ │ └ │ │
│ ╰─────────────────────────────────────────────────────────────────────────╯ │
│ │
│ Signatures: │
│ TlFSqK8uxC/Beh/VK1Laj5H+LDTHMhs4OC+DebF5khNHLsYBlOSu8n7o5JpOQmFp6VtrnZEXvCYHYPJW47/SCg== │
│ │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Effects │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Digest: 8AP4hMhCgNwZLMomRzRniaF9mvqw7aBq9SFsYTcFSCho │
│ Status: Success │
│ Executed Epoch: 32 │
│ │
│ Created Objects: │
│ ┌── │
│ │ ID: 0x2774970297daeb94868351b85f444a2c4ed9f369731cdeab45fe8a3c6c9b275e │
│ │ Owner: Shared( 4 ) │
│ │ Version: 4 │
│ │ Digest: BDmCJbCn8MHM1bXwPtvEHnxqmhUe4pT5cxyGdeam4UQV │
│ └── │
│ ┌── │
│ │ ID: 0x37f5889788fe0d838e08ab4eed13c5bd5005dec1860cd5764b52e6498daeb809 │
│ │ Owner: Shared( 4 ) │
│ │ Version: 4 │
│ │ Digest: awYPvEAPVZKnQvd4nodbFaP8esQHHtmiMxfjkBpTLW6 │
│ └── │
│ ┌── │
│ │ ID: 0x3b83c74ddd580763bd76e79b05a9d94b245d41d6a66604684fc78d83f055dc86 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ Version: 4 │
│ │ Digest: DLgi2in87LpKWJiLrDVsCz2rojyWcQiibrewifTsXsnq │
│ └── │
│ ┌── │
│ │ ID: 0x50cda73460073262f1cbf202475f84a78fa074d09e656cd828141e12200746b5 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ Version: 4 │
│ │ Digest: 8qTF5B63pKheLbHjYgEigWJBVzU76wNzrDwHW3Y1MeNF │
│ └── │
│ ┌── │
│ │ ID: 0x59115debba94b7130a90c0a05ea8b8ffde6d7c2d9cf23e939627f5a6327c72b1 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ Version: 4 │
│ │ Digest: 7Vmz5oH8mz6TPuriHCzHs1sNDcnKG1bRJ8M8WLQbYfEa │
│ └── │
│ ┌── │
│ │ ID: 0x6645d4801f7f225d0464069f7d4ecc15fe285af4b58b3c6de84bf4b2600bf9ce │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ Version: 4 │
│ │ Digest: H2emtQYNWu2cM8rFwTVKK4qsgSrvcKgFT3Kg1uCAoLR8 │
│ └── │
│ ┌── │
│ │ ID: 0x7fbd53eaa0da91fbeeb75228225ae9ed7e11a1e128c3e5eed378b902c2d5589f │
│ │ Owner: Immutable │
│ │ Version: 1 │
│ │ Digest: Bpmjoi8FE41o36Akz6uNBNVWtev4394uK23gfTUKHc3e │
│ └── │
│ ┌── │
│ │ ID: 0xa723ee12b211122f3decb61eba8f415524972420d3d02d3937a5ba4983d9a9b7 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ Version: 4 │
│ │ Digest: FFNCVz1CeDRWYFS3fQsXr8jKTvyp429qnc8kACBsm2qu │
│ └── │
│ Mutated Objects: │
│ ┌── │
│ │ ID: 0x74a902976cdef6e2c9a7860a5a95db898417686904428cea856e184fc9ffefd5 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ Version: 4 │
│ │ Digest: 6dSVFjiemCurUTBA2f2Ma3b3vYCzvTWjayRcrfFXD7G6 │
│ └── │
│ Gas Object: │
│ ┌── │
│ │ ID: 0x74a902976cdef6e2c9a7860a5a95db898417686904428cea856e184fc9ffefd5 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ Version: 4 │
│ │ Digest: 6dSVFjiemCurUTBA2f2Ma3b3vYCzvTWjayRcrfFXD7G6 │
│ └── │
│ Gas Cost Summary: │
│ Storage Cost: 123629200 MIST │
│ Computation Cost: 1090000 MIST │
│ Storage Rebate: 978120 MIST │
│ Non-refundable Storage Fee: 9880 MIST │
│ │
│ Transaction Dependencies: │
│ AE5JSYAHBZV6anUMRuMG4Qk2SeMc5Qy8TtfJBnrG87z5 │
│ DRPNPAgkf7qnqYsm5eB4TTCMTzLcW6prwjhXNfPTZyok │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Block Events │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌── │
│ │ EventID: 8AP4hMhCgNwZLMomRzRniaF9mvqw7aBq9SFsYTcFSCho:0 │
│ │ PackageID: 0x7fbd53eaa0da91fbeeb75228225ae9ed7e11a1e128c3e5eed378b902c2d5589f │
│ │ Transaction Module: cuon_chun │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ EventType: 0x2::display::DisplayCreated<0x7fbd53eaa0da91fbeeb75228225ae9ed7e11a1e128c3e5eed378b902c2d5589f::cuon_chun::CuonChunNFT> │
│ │ Timestamp: 1773192318369 │
│ └── │
│ │ ParsedJSON: │
│ │ ┌──┐ │
│ │ │ │ │
│ │ └──┘ │
│ └── │
│ ┌── │
│ │ EventID: 8AP4hMhCgNwZLMomRzRniaF9mvqw7aBq9SFsYTcFSCho:1 │
│ │ PackageID: 0x7fbd53eaa0da91fbeeb75228225ae9ed7e11a1e128c3e5eed378b902c2d5589f │
│ │ Transaction Module: cuon_chun │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ EventType: 0x2::display::VersionUpdated<0x7fbd53eaa0da91fbeeb75228225ae9ed7e11a1e128c3e5eed378b902c2d5589f::cuon_chun::CuonChunNFT> │
│ │ Timestamp: 1773192318369 │
│ └── │
│ │ ParsedJSON: │
│ │ ┌──┐ │
│ │ │ │ │
│ │ └──┘ │
│ └── │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Object Changes │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Created Objects: │
│ ┌── │
│ │ ObjectID: 0x2774970297daeb94868351b85f444a2c4ed9f369731cdeab45fe8a3c6c9b275e │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Shared( 4 ) │
│ │ ObjectType: 0x7fbd53eaa0da91fbeeb75228225ae9ed7e11a1e128c3e5eed378b902c2d5589f::craft::Treasury │
│ │ Version: 4 │
│ │ Digest: BDmCJbCn8MHM1bXwPtvEHnxqmhUe4pT5cxyGdeam4UQV │
│ └── │
│ ┌── │
│ │ ObjectID: 0x37f5889788fe0d838e08ab4eed13c5bd5005dec1860cd5764b52e6498daeb809 │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Shared( 4 ) │
│ │ ObjectType: 0x7fbd53eaa0da91fbeeb75228225ae9ed7e11a1e128c3e5eed378b902c2d5589f::marketplace::Market │
│ │ Version: 4 │
│ │ Digest: awYPvEAPVZKnQvd4nodbFaP8esQHHtmiMxfjkBpTLW6 │
│ └── │
│ ┌── │
│ │ ObjectID: 0x3b83c74ddd580763bd76e79b05a9d94b245d41d6a66604684fc78d83f055dc86 │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ ObjectType: 0x7fbd53eaa0da91fbeeb75228225ae9ed7e11a1e128c3e5eed378b902c2d5589f::craft::AdminCap │
│ │ Version: 4 │
│ │ Digest: DLgi2in87LpKWJiLrDVsCz2rojyWcQiibrewifTsXsnq │
│ └── │
│ ┌── │
│ │ ObjectID: 0x50cda73460073262f1cbf202475f84a78fa074d09e656cd828141e12200746b5 │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ ObjectType: 0x2::display::Display<0x7fbd53eaa0da91fbeeb75228225ae9ed7e11a1e128c3e5eed378b902c2d5589f::cuon_chun::CuonChunNFT> │
│ │ Version: 4 │
│ │ Digest: 8qTF5B63pKheLbHjYgEigWJBVzU76wNzrDwHW3Y1MeNF │
│ └── │
│ ┌── │
│ │ ObjectID: 0x59115debba94b7130a90c0a05ea8b8ffde6d7c2d9cf23e939627f5a6327c72b1 │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ ObjectType: 0x2::package::Publisher │
│ │ Version: 4 │
│ │ Digest: 7Vmz5oH8mz6TPuriHCzHs1sNDcnKG1bRJ8M8WLQbYfEa │
│ └── │
│ ┌── │
│ │ ObjectID: 0x6645d4801f7f225d0464069f7d4ecc15fe285af4b58b3c6de84bf4b2600bf9ce │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ ObjectType: 0x2::package::UpgradeCap │
│ │ Version: 4 │
│ │ Digest: H2emtQYNWu2cM8rFwTVKK4qsgSrvcKgFT3Kg1uCAoLR8 │
│ └── │
│ ┌── │
│ │ ObjectID: 0xa723ee12b211122f3decb61eba8f415524972420d3d02d3937a5ba4983d9a9b7 │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ ObjectType: 0x7fbd53eaa0da91fbeeb75228225ae9ed7e11a1e128c3e5eed378b902c2d5589f::player_profile::MatchOracle │
│ │ Version: 4 │
│ │ Digest: FFNCVz1CeDRWYFS3fQsXr8jKTvyp429qnc8kACBsm2qu │
│ └── │
│ Mutated Objects: │
│ ┌── │
│ │ ObjectID: 0x74a902976cdef6e2c9a7860a5a95db898417686904428cea856e184fc9ffefd5 │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ ObjectType: 0x2::coin::Coin<0x2::sui::SUI> │
│ │ Version: 4 │
│ │ Digest: 6dSVFjiemCurUTBA2f2Ma3b3vYCzvTWjayRcrfFXD7G6 │
│ └── │
│ Published Objects: │
│ ┌── │
│ │ PackageID: 0x7fbd53eaa0da91fbeeb75228225ae9ed7e11a1e128c3e5eed378b902c2d5589f │
│ │ Version: 1 │
│ │ Digest: Bpmjoi8FE41o36Akz6uNBNVWtev4394uK23gfTUKHc3e │
│ │ Modules: achievement, craft, cuon_chun, marketplace, player_profile, scrap, trade_up │
│ └── │
╰───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Balance Changes │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌── │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ CoinType: 0x2::sui::SUI │
│ │ Amount: -123741080 │
│ └── │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
