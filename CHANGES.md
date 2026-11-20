# Changes

## Unreleased

- Cross-listed `percolator-2010` and `cockroachdb-2020` under Distributed Transactions, and added the ACM TODS and Communications of the ACM venues.
- Added the Replicated Data Types track (CRDTs and collaborative editing), cross-listing `eventually-consistent-2009`.
- Added the Physical Hybrid Time track (TrueTime, hybrid logical clocks, and clock synchronization), cross-listing `lamport-time-clocks-1978`, `spanner-2012`, `logical-physical-clocks-2014`, `spanner-truetime-cap-2017`, and `cockroachdb-2020`; also added `logical-physical-clocks-2014` to Causality Tracking.
- Added the Causality Tracking track, cross-listing `lamport-time-clocks-1978` and `dynamo-2007`.
- Added `data/relations.yaml` for curated edge types (`builds_on`, `simplifies`, `supersedes`, `refines`, `contradicts`) and notes, with validation and export to `data/edges.json` (format v2) and `llms.txt`.
- Added generated `data/edges.json` (papers, reading-order edges, tracks) and `llms.txt` exports via `scripts/export.py`.
- Fixed paper bookmarks jumping the page back to the beginning.
- Added count pills and completion checks to the Tracks jump navigation.
- Added explicit “Expand remaining” and “Collapse open” actions for partially expanded Tracks.
- Redesigned Tracks as guided reading journeys with summaries, responsive timelines, local progress, jump links, and expand/collapse controls.
- Added local paper bookmarks and a dedicated Bookmarks view.
- Replaced the reading-progress browser prompt with an accessible HTML dialog.
- Added an accessible “Back to results” link for long listings.
- Aligned year, decade, and results-summary jumps with the rendered filter height.
- Corrected generated `Mlops` labels to `MLOps`.

Paper additions contained in the squashed catalog commit. Dates use
`YYYY-DD-MM`, followed by the abbreviated commit hash.

## 2026-20-11 - 4e58e99

- `adya-thesis-1999`
- `seeing-is-believing-2017`
- `walter-psi-2011`
- `cops-2011`
- `session-guarantees-1994`
- `paxos-commit-2006`
- `sagas-1987`
- `keeping-calm-2020`
- `acidrain-2017`
- `elle-2020`

## 2026-20-11 - 32928cc

- `conflict-free-replicated-relations-2020`
- `keep-calm-crdt-on-2022`
- `synql-2024`

## 2026-20-11 - 7204af7

- `rum-conjecture-2016`
- `access-methods-tradeoffs-2016`

## 2026-20-11 - e5f27df

- `woot-2006`
- `treedoc-2009`
- `logoot-2009`
- `rga-2011`
- `crdts-2011`
- `crdt-comprehensive-study-2011`
- `optimized-or-set-2012`
- `replicated-data-types-popl-2014`
- `op-based-crdts-2014`
- `delta-mutation-crdts-2015`
- `collaborative-text-editing-2016`
- `json-crdt-2017`
- `verifying-sec-2017`
- `pure-op-based-crdts-2017`
- `delta-state-crdts-2018`
- `crdt-overview-2018`
- `local-first-software-2019`
- `efficient-sync-crdts-2019`

## 2026-20-11 - 280b2ba

- `maintaining-time-distributed-1983`
- `synchronized-clocks-1991`
- `augmented-time-2013`
- `hybrid-vector-clocks-2015`
- `huygens-2018`
- `mongodb-cluster-logical-clock-2019`
- `sundial-2020`

## 2026-20-11 - ae56c4d

- `mutual-inconsistency-detection-1983`
- `eventually-consistent-2009`
- `dotted-version-vectors-2010`
- `dotted-version-vectors-podc-2012`
- `dvv-sets-2014`
- `logical-clocks-easy-2016`

## 2026-16-08 - 01f7077

- `art-2013`
- `hot-2018`
- `surf-2018`
- `order-preserving-key-compression-2020`
- `memory-efficient-search-trees-2021`
- `memento-filter-2024`

- `data-blocks-2016`
- `mainlining-databases-2020`
- `empirical-columnar-formats-2023`
- `btrblocks-2023`
- `fastlanes-file-format-2025`
- `analytical-dbms-data-formats-2025`
- `f3-file-format-2025`

- `relational-model-1970`
- `hints-computer-system-design-1983`
- `zyzzyva-2007`
- `dryad-2007`
- `ramcloud-2011`
- `dominant-resource-fairness-2011`
- `distbelief-2012`
- `epaxos-2013`
- `discretized-streams-2013`
- `logical-physical-clocks-2014`
- `lineage-driven-fault-injection-2015`
- `differential-dataflow-2015`
- `hotstuff-2019`
- `linearizable-quorum-reads-paxos-2019`
- `pigpaxos-2021`
- `lifeguard-2018`
- `eddies-2000`
- `bwtree-2013`
- `postgresql-ssi-2012`
- `tapir-2015`
- `panopticon-2015`
- `instant-recovery-wal-2015`
- `tictoc-2016`
- `wankeeper-2017`
- `pulsar-2017`
- `leanstore-2018`
- `live-data-migration-2018`
- `presto-2019`
- `diskann-2019`
- `ml-metadata-2020`
- `bao-2021`
- `apache-hudi-2021`
- `dream-electric-sheep-2021`
- `aria-2020`
- `vbase-2023`
- `vector-database-survey-2024`
- `salus-2019`
- `clockwork-2020`
- `ansor-2020`
- `gshard-2020`
- `tf-data-2021`
- `distserve-2024`
- `sglang-2024`

- `dissecting-replication-protocols-2019`
- `wpaxos-2020`
- `bunchbft-2022`
- `mongodb-distributed-transactions-verification-2025`
- `evaluating-distributed-coordination-2026`
- `leaseguard-2026`

- `volcano-parallelism-1990`
- `query-evaluation-techniques-1993`
- `cascades-1995`
- `five-minute-rule-1997`
- `modern-btree-techniques-2011`
- `in-memory-performance-big-data-2014`
- `napa-2021`
- `napa-progressive-partitioning-2023`
- `blsm-2012`
- `wisckey-2016`
- `monkey-2017`
- `pebblesdb-2017`
- `dostoevsky-2018`
- `lsm-storage-survey-2020`
- `rocksdb-experience-2021`

- `memory-access-bottleneck-1999`
- `dbmss-modern-processor-1999`
- `database-cracking-2007`
- `hyper-2011`
- `monetdb-two-decades-2012`
- `morsel-driven-parallelism-2014`
- `how-good-query-optimizers-2015`
- `amazon-redshift-2015`
- `f1-query-2018`
- `compiled-vs-vectorized-2018`
- `f1-lightning-2020`
- `umbra-2020`
- `percolator-2010`
- `f1-online-schema-change-2013`
- `sql-pipes-2024`
- `spanner-becoming-sql-2017`
- `spanner-truetime-cap-2017`
- `f1-fault-tolerant-2012`

- `lamport-time-clocks-1978`
- `transaction-concept-1981`
- `byzantine-generals-1982`
- `end-to-end-1984`
- `flp-1985`
- `viewstamped-1988`
- `aries-1992`
- `volcano-1994`
- `ansi-isolation-1995`
- `lsm-1996`
- `paxos-1998`
- `adya-2000`
- `swim-2002`
- `kelips-2003`
- `gfs-2003`
- `chain-replication-2004`
- `mapreduce-2004`
- `cstore-2005`
- `x100-2005`
- `bigtable-2006`
- `ceph-2006`
- `chubby-2006`
- `architecture-db-2007`
- `dynamo-2007`
- `paxos-made-live-2007`
- `end-architectural-era-2007`
- `cassandra-2010`
- `zookeeper-2010`
- `neumann-2011`
- `kafka-2011`
- `megastore-2011`
- `mesos-2011`
- `calvin-2012`
- `rdd-2012`
- `spanner-2012`
- `f1-2013`
- `naiad-2013`
- `omega-2013`
- `silo-2013`
- `tao-2013`
- `raft-2014`
- `parameter-server-2014`
- `technical-debt-2015`
- `borg-2015`
- `tensorflow-2016`
- `snowflake-2016`
- `aurora-2017`
- `clipper-2017`
- `samza-2017`
- `gandiva-2018`
- `ray-2018`
- `tvm-2018`
- `delta-lake-2020`
- `zero-2020`
- `lakehouse-2021`
- `alpa-2022`
- `dynamodb-2022`
- `orca-2022`
- `dynamodb-transactions-2023`
- `vllm-2023`
- `what-goes-around-2024`
- `llm-relational-analytics-2025`
- `rubick-2025`
- `sola-2025`
- `tag-2025`
- `thunderserve-2025`
- `youmu-2025`
- `dips-2026`
- `ecoserve-2026`
- `distca-2026`
- `fest-2026`
- `prompts-2026`
- `pilot-2026`
- `prism-2026`
- `superinfer-2026`
- `themis-2026`
- `writeguards-2026`
- `pbft-1999`
- `chord-2001`
- `System-r-access-path-1979`
- `granularity-locks-1976`
- `hekaton-2013`
- `farm-2015`
- `foundationdb-2021`
- `learned-index-2018`
- `duckdb-2019`
- `dremel-2010`
- `millwheel-2013`
- `Dataflow-2015`
- `flink-2015`
- `firmament-2016`
- `borg-omega-k8s-2016`
- `tail-at-scale-2013`
- `life-beyond-transactions-2007`
- `pacelc-2012`
- `tfx-2017`
- `Data-validation-2019`
- `mlflow-2018`
- `horovod-2018`
- `megatron-2019`
- `pipedream-2019`
- `pollux-2021`
- `flexible-paxos-2016`
- `raft-refloated-2015`
- `paxos-vs-raft-2020`
- `distributed-consensus-revised-2019`
- `h-store-2008`
- `one-size-fits-all-2005`
- `mapreduce-parallel-dbms-2010`
- `self-driving-dbms-2017`
- `ottertune-2017`
- `snapshot-isolation-serializable-2005`
- `hat-2014`
- `coordination-avoidance-2015`
- `feral-concurrency-control-2015`
- `staring-into-the-abyss-2014`
- `bohm-2015`
- `deterministic-databases-overview-2018`
- `slog-2019`
- `detock-2023`
- `ciel-2011`
- `musketeer-2015`
- `decima-2019`
- `noria-2018`
- `tetrisched-2016`
- `aurora-dsql-2026`
- `oltp-looking-glass-2008`
- `oltp-looking-glass-16-years-later-2025`
- `serializable-isolation-snapshot-databases-2008`
- `allocating-isolation-levels-2005`
- `aurora-consensus-2018`
- `redshift-reinvented-2022`
- `socrates-2019`
- `polarfs-2018`
- `x-engine-2019`
- `analyticdb-2019`
- `oceanbase-2022`
- `vertica-2012`
- `photon-2022`
- `clickhouse-2024`
- `db2-blu-2013`
- `sap-hana-2012`
- `oracle-in-memory-2015`
- `pnuts-2008`
- `espresso-2013`
- `cockroachdb-2020`
- `tidb-2020`
- `singlestore-2022`
- `milvus-2021`
- `wiredtiger-io-2016`
