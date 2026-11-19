import json
import tempfile
import unittest
from pathlib import Path

from scripts import export

ROOT = Path(__file__).resolve().parent.parent

CONFIG = "schema_version: 5\nsite:\n  title: T\n  tagline: Tag.\n"
PAPERS = """
lineages:
  llm-serving: [b-2020, a-2010]
papers:
  - id: a-2010
    title: 'A: First'
    year: 2010
    why_read: Start here.
    links:
      paper: https://example.org/a
    predecessors: []
    successors: [b-2020]
  - id: b-2020
    title: B
    year: 2020
    why_read: Then this.
    links: {}
    predecessors: [a-2010]
    successors: []
  - id: c-2021
    title: C
    year: 2021
    why_read: Builds on A.
    links: {}
    predecessors: [a-2010]
"""


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "data").mkdir()
        (self.root / "config.yaml").write_text(CONFIG)
        (self.root / "data/papers.yaml").write_text(PAPERS)

    def tearDown(self):
        self.tmp.cleanup()

    def write_relations(self, text):
        (self.root / "data/relations.yaml").write_text(text)

    def graph(self):
        out = export.build_outputs(self.root, "https://x.test/rt")
        return json.loads(out[export.EDGES_PATH]), out[export.LLMS_PATH]

    def test_edges_union_and_provenance(self):
        g, _ = self.graph()
        self.assertEqual(g["edges"], [
            {"from": "a-2010", "to": "b-2020", "relation": "read_before", "order": True,
             "declared_in": ["predecessors", "successors"]},
            {"from": "a-2010", "to": "c-2021", "relation": "read_before", "order": True,
             "declared_in": ["predecessors"]},
        ])
        self.assertEqual(g["counts"]["edges"], 2)
        self.assertEqual(g["counts"]["relations"]["read_before"], 2)
        self.assertEqual(g["tracks"][0]["label"], "LLM Serving")
        self.assertEqual(g["nodes"][0]["url"], "https://example.org/a")
        self.assertNotIn("url", g["nodes"][1])

    def test_relations_annotate_and_add_edges(self):
        self.write_relations("""
relations:
  - from: a-2010
    to: b-2020
    type: simplifies
    note: "  Same idea,
      simpler.  "
  - from: c-2021
    to: b-2020
    type: contradicts
    order: false
""")
        g, txt = self.graph()
        by_key = {(e["from"], e["to"]): e for e in g["edges"]}
        self.assertEqual(by_key[("a-2010", "b-2020")], {
            "from": "a-2010", "to": "b-2020", "relation": "simplifies", "order": True,
            "note": "Same idea, simpler.", "declared_in": ["predecessors", "relations", "successors"]})
        self.assertEqual(by_key[("c-2021", "b-2020")], {
            "from": "c-2021", "to": "b-2020", "relation": "contradicts", "order": False,
            "declared_in": ["relations"]})
        self.assertEqual(g["counts"]["relations"]["simplifies"], 1)
        self.assertIn("- B (2020) simplifies A: First (2010): Same idea, simpler.", txt)
        self.assertIn("- B (2020) contradicts C (2021)", txt)

    def test_no_relations_section_without_relations(self):
        _, txt = self.graph()
        self.assertNotIn("Curated relations", txt)

    def test_llms_txt_links_and_order(self):
        _, txt = self.graph()
        self.assertTrue(txt.startswith("# T\n\n> Tag."))
        self.assertIn("https://x.test/rt/data/edges.json", txt)
        a = txt.index("[A: First (2010)](https://example.org/a): Start here.")
        b = txt.index("- B (2020): Then this.")
        self.assertLess(a, b)

    def test_check_mode_detects_staleness(self):
        args = ["--root", str(self.root)]
        self.assertEqual(export.main(args + ["--check"]), 1)
        self.assertEqual(export.main(args), 0)
        self.assertEqual(export.main(args + ["--check"]), 0)

    def test_committed_exports_are_current(self):
        self.assertEqual(export.main(["--check"]), 0)


if __name__ == "__main__":
    unittest.main()
