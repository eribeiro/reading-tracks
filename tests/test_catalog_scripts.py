import tempfile
import unittest
from pathlib import Path

import yaml

from scripts.bootstrap import DEFAULTS, bootstrap, build_documents
from scripts.import_bibtex import import_entries, load_catalog, parse_bibtex


SAMPLE_BIBTEX = r'''
@inproceedings{dean2004mapreduce,
  author = {Dean, Jeffrey and Sanjay Ghemawat},
  title = {{MapReduce}: Simplified Data Processing on Large Clusters},
  year = {2004},
  booktitle = {6th USENIX Symposium on Operating Systems Design and Implementation},
  doi = {10.1145/1327452.1327492},
  keywords = {distributed systems, batch processing}
}

@article{missing-year,
  author = {Nobody, N.},
  title = {Incomplete Record}
}
'''


class BootstrapTests(unittest.TestCase):
    def test_builds_minimum_catalog(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            targets = bootstrap(root, build_documents(dict(DEFAULTS)))
            self.assertEqual(len(targets), 4)
            config = yaml.safe_load((root / "config.yaml").read_text())
            papers = yaml.safe_load((root / "data/papers.yaml").read_text())
            self.assertEqual(config["schema_version"], 5)
            self.assertEqual(config["areas"], ["Computer Science"])
            self.assertEqual(papers["papers"], [])
            self.assertEqual(papers["lineages"], {})

    def test_refuses_to_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            documents = build_documents(dict(DEFAULTS))
            bootstrap(root, documents)
            with self.assertRaises(FileExistsError):
                bootstrap(root, documents)


class BibtexTests(unittest.TestCase):
    def test_parses_nested_values_and_authors(self):
        entries = parse_bibtex(SAMPLE_BIBTEX)
        self.assertEqual(len(entries), 2)
        self.assertEqual(entries[0]["title"], "MapReduce: Simplified Data Processing on Large Clusters")
        self.assertEqual(entries[0]["doi"], "10.1145/1327452.1327492")

    def test_imports_and_merges_catalog(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            bootstrap(root, build_documents(dict(DEFAULTS)))
            config, papers, researchers, venues = load_catalog(root)
            counts = import_entries(
                parse_bibtex(SAMPLE_BIBTEX),
                config,
                papers,
                researchers,
                venues,
                area="Distributed Systems",
                add_area=True,
            )
            self.assertEqual(counts, {"papers": 1, "researchers": 2, "venues": 1, "skipped": 1})
            paper = papers["papers"][0]
            self.assertEqual(paper["authors"], ["Jeffrey Dean", "Sanjay Ghemawat"])
            self.assertEqual(paper["links"]["paper"], "https://doi.org/10.1145/1327452.1327492")
            self.assertIn("Distributed Systems", config["areas"])
            self.assertEqual(researchers["researchers"][0]["paper_ids"], [paper["id"]])

            duplicate_counts = import_entries(
                parse_bibtex(SAMPLE_BIBTEX), config, papers, researchers, venues
            )
            self.assertEqual(duplicate_counts["papers"], 0)
            self.assertEqual(duplicate_counts["skipped"], 2)

    def test_unknown_area_requires_opt_in(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            bootstrap(root, build_documents(dict(DEFAULTS)))
            config, papers, researchers, venues = load_catalog(root)
            with self.assertRaisesRegex(ValueError, "--add-area"):
                import_entries(
                    parse_bibtex(SAMPLE_BIBTEX),
                    config,
                    papers,
                    researchers,
                    venues,
                    area="Databases",
                )


if __name__ == "__main__":
    unittest.main()
