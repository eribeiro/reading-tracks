import unittest

from scripts import validate

PAPERS = [
    {"id": "a", "predecessors": [], "successors": ["b"]},
    {"id": "b", "predecessors": ["a"]},
    {"id": "c"},
]
IDS = {"a", "b", "c"}


class RelationValidationTests(unittest.TestCase):
    def run_check(self, relations):
        validate.errors.clear()
        validate.check_relations(relations, PAPERS, IDS)
        return list(validate.errors)

    def test_valid_entries(self):
        self.assertEqual(self.run_check([
            {"from": "a", "to": "b", "type": "simplifies", "note": "Shorter."},
            {"from": "c", "to": "b", "type": "contradicts", "order": False},
        ]), [])

    def test_rejects_bad_entries(self):
        errs = self.run_check([
            {"from": "a", "to": "zzz", "type": "simplifies"},
            {"from": "a", "to": "a", "type": "simplifies"},
            {"from": "a", "to": "c", "type": "inspires"},
            {"from": "c", "to": "a", "type": "refines", "note": "x" * 121},
            {"from": "b", "to": "c", "type": "refines", "order": "no"},
            {"from": "b", "to": "c", "type": "refines", "status": "draft"},
        ])
        joined = "\n".join(errs)
        for needle in ("unknown paper id 'zzz'", "same paper", "'inspires' is not one of",
                       "longer than 120", "order must be true or false",
                       "unknown field(s) status", "duplicate relation"):
            self.assertIn(needle, joined)

    def test_order_false_on_declared_edge(self):
        errs = self.run_check([{"from": "a", "to": "b", "type": "refines", "order": False}])
        self.assertTrue(any("already declares" in e for e in errs))

    def test_cycle_through_relation(self):
        errs = self.run_check([{"from": "b", "to": "a", "type": "builds_on"}])
        self.assertTrue(any(e.startswith("reading-order cycle:") for e in errs), errs)
        self.assertEqual(self.run_check([{"from": "b", "to": "a", "type": "contradicts", "order": False}]), [])

    def tearDown(self):
        validate.errors.clear()


if __name__ == "__main__":
    unittest.main()
