# Evaluation sample: ELLIPSE (30 essays)

`ellipse-sample.json` holds 30 essays from the ELLIPSE corpus with the human
scores the corpus gives them. `npm run eval` grades them and compares
Markwise's scores with the human ones (see `../README.md`).

## Source and license

- **Corpus:** The English Language Learner Insight, Proficiency and Skills
  Evaluation (ELLIPSE) Corpus. File `ELLIPSE_Final_github_train.csv` from
  <https://github.com/scrosseye/ELLIPSE-Corpus>.
- **License:** [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
  (Attribution, NonCommercial, ShareAlike), as stated in the corpus README.
  This sample file is shared under the same license. It is used here for
  non-commercial evaluation only. The rest of this repository is not covered
  by this license.
- **Citation:** Crossley, S. A., Tian, Y., Baffour, P., Franklin, A., Kim, Y.,
  Morris, W., Benner, B., Picou, A., & Boser, U. (2023). Measuring second
  language proficiency using the English Language Learner Insight, Proficiency
  and Skills Evaluation (ELLIPSE) Corpus. *International Journal of Learner
  Corpus Research, 9*(2), 248-269.

## What is in it

- Essays by English language learners in grades 8 to 12, written to
  open-ended prompts. The corpus authors anonymized them: names appear as
  `Generic_Name`.
- Per essay, the file keeps four things:
  - the corpus id (`text_id_kaggle`);
  - the prompt's short name;
  - the text;
  - the seven human scores: Overall, Cohesion, Syntax, Vocabulary,
    Phraseology, Grammar, Conventions.
- Scores run from 1 to 5 in half points. Each is the average of two trained
  raters.
- **Dropped:** every demographic column (gender, grade, race/ethnicity,
  economic status) and the corpus's text statistics. Nothing here identifies a
  student.

## How the 30 were picked

`scripts/eval/build-ellipse-sample.mjs` takes five essays from each of six
bands of the human Overall score (1-2, 2.5, 3, 3.5, 4, 4.5-5), so the sample
covers weak and strong writing rather than mostly 3s. Within a band, it orders
essays by a SHA-256 of a fixed salt and the essay id, so anyone can rebuild
the same sample from the corpus file.

This is a **small sample**. 30 essays are enough to spot a grader that is badly
off, but not to measure accuracy precisely. Treat every number from it as a
rough indication.
