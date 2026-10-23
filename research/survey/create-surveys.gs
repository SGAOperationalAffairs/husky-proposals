/**
 * Husky Proposals surveys
 * Builds two Google Forms: one for students and one for SGA leaders.
 *
 * How to run:
 * 1. Go to script.google.com and create a new project.
 * 2. Paste this whole file over the default code and save.
 * 3. Optional: upload the five screenshots to Google Drive and paste their
 *    file IDs into CONFIG.images below. Skip this and add images by hand later.
 * 4. Choose "createSurveys" in the function menu and press Run.
 *    Approve the permissions when asked.
 * 5. Open View > Execution log to get the links. Both forms also appear in
 *    your Google Drive.
 *
 * Note: this was written without access to Google, so it has not been run.
 * If a line errors, the message names the line. Send it back and it can be fixed.
 */

const CONFIG = {
  // true builds the shorter version (core questions only, about 7 minutes).
  // false builds the full version with the extra questions (about 10 minutes).
  coreOnly: true,
  contactEmail: 'sgacampusaffairs@northeastern.edu',
  // Optional: link to a SEPARATE form where people can leave an email.
  // Keeping it separate means survey answers stay anonymous.
  contactFormUrl: '',
  // Optional Google Drive file IDs for the screenshots.
  images: { feed: '', idea: '', support: '', queue: '', people: '' }
};

const AGREE = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree', 'Not sure'];
const RANKS = ['1st', '2nd', '3rd', '4th', '5th'];
const CRITERIA = [
  'The idea with the most student support',
  'An idea that is quick and low cost to finish',
  'An idea that would help the most students',
  'An idea that would help students with the greatest need, even if fewer students are affected',
  'An idea the university is most likely to approve'
];

function createSurveys() {
  const student = buildStudentForm();
  const leader = buildLeaderForm();
  Logger.log('Student survey (share this one with students):');
  Logger.log('  Fill out: ' + student.getPublishedUrl());
  Logger.log('  Edit:     ' + student.getEditUrl());
  Logger.log('SGA leader survey (share this one with leaders):');
  Logger.log('  Fill out: ' + leader.getPublishedUrl());
  Logger.log('  Edit:     ' + leader.getEditUrl());
}

/* ---------- helpers ---------- */

function makeBuilder(form) {
  const skip = function (core) { return CONFIG.coreOnly && !core; };
  return {
    heading: function (title, help) {
      form.addSectionHeaderItem().setTitle(title).setHelpText(help || '');
    },
    section: function (title, help) {
      form.addPageBreakItem().setTitle(title).setHelpText(help || '');
    },
    image: function (key, title) {
      const id = CONFIG.images[key];
      if (!id) return;
      form.addImageItem().setTitle(title).setImage(DriveApp.getFileById(id).getBlob());
    },
    radio: function (core, title, choices, help) {
      if (skip(core)) return;
      const item = form.addMultipleChoiceItem().setTitle(title).setChoiceValues(choices);
      if (help) item.setHelpText(help);
    },
    checks: function (core, title, choices, help, max) {
      if (skip(core)) return;
      const item = form.addCheckboxItem().setTitle(title).setChoiceValues(choices);
      if (help) item.setHelpText(help);
      if (max) {
        item.setValidation(
          FormApp.createCheckboxValidation()
            .setHelpText('Pick up to ' + max + '.')
            .requireSelectAtMost(max)
            .build()
        );
      }
    },
    scale: function (core, title, low, high, help) {
      if (skip(core)) return;
      const item = form.addScaleItem().setTitle(title).setBounds(1, 5).setLabels(low, high);
      if (help) item.setHelpText(help);
    },
    grid: function (core, title, rows, cols, help, rank) {
      if (skip(core)) return;
      const item = form.addGridItem().setTitle(title).setRows(rows).setColumns(cols);
      if (help) item.setHelpText(help);
      if (rank) {
        try {
          item.setValidation(
            FormApp.createGridValidation()
              .setHelpText('Use each rank only once.')
              .requireLimitOneResponsePerColumn()
              .build()
          );
        } catch (e) {
          Logger.log('Ranking limit was not applied to "' + title + '". Set it by hand in the form: Response validation > Limit to one response per column. ' + e);
        }
      }
    },
    text: function (core, title, help) {
      if (skip(core)) return;
      const item = form.addParagraphTextItem().setTitle(title);
      if (help) item.setHelpText(help);
    }
  };
}

function newForm(title, description, confirmation) {
  const form = FormApp.create(title);
  form.setDescription(description);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);
  let msg = confirmation;
  if (CONFIG.contactFormUrl) {
    msg += '\n\nWant to hear what we learn, or join a short follow-up conversation? Leave your email here. It is a separate form, so your survey answers stay anonymous: ' + CONFIG.contactFormUrl;
  }
  form.setConfirmationMessage(msg);
  return form;
}

/* ---------- student survey ---------- */

function buildStudentForm() {
  const form = newForm(
    'Help shape how students share ideas with SGA',
    'Hi! We are the Campus Affairs team in the Student Government Association (SGA). ' +
    'We are thinking about a new website where students can post ideas for campus, support the ideas they care about, and see what happens next.\n\n' +
    'Before we build anything, we want to know what you think, including if you think this is a bad idea. There are no right answers.\n\n' +
    'This takes about ' + (CONFIG.coreOnly ? '7' : '10') + ' minutes. It is anonymous and voluntary, and you can skip any question. ' +
    'We only report results in groups, never individual answers. Questions? ' + CONFIG.contactEmail,
    'Thank you! Your answers are anonymous. We plan to share what we learn with students.'
  );
  const b = makeBuilder(form);

  // About you
  b.heading('About you', 'All of these are optional. We use them only to check whether answers differ across groups, and we only report groups of 10 or more people.');
  b.radio(true, 'What year are you?', ['First year', 'Second year', 'Third year', 'Fourth year', 'Fifth year or later', 'Prefer not to say']);
  b.radio(true, 'Where are you this semester?', ['On the Boston campus', 'On co-op in or near Boston', 'On co-op somewhere else', 'At another Northeastern campus or a global program', 'Other', 'Prefer not to say']);
  b.radio(true, 'Where do you live?', ['On-campus housing', 'Off campus, near campus', 'Commute from home', 'Other', 'Prefer not to say']);
  b.radio(true, 'Which college are you in?', ['Khoury College of Computer Sciences', 'College of Engineering', "D'Amore-McKim School of Business", 'College of Science', 'Bouvé College of Health Sciences', 'College of Social Sciences and Humanities', 'College of Arts, Media and Design', 'Explore Program or undeclared', 'Other', 'Prefer not to say']);
  b.checks(false, 'Which of these describe you? Select all that apply.', ['International student', 'Transfer student', 'First-generation college student', 'None of these', 'Prefer not to say']);

  // How things work today
  b.section('How things work today', 'First, a few questions about how you share ideas now. There is nothing to look up.');
  b.scale(true, 'How familiar are you with what SGA does?', 'Not at all familiar', 'Very familiar');
  b.grid(true, 'How much do you agree with each statement?', [
    'I know how to share an idea or concern with SGA.',
    'I believe SGA can get the university to act on student concerns.',
    'I believe my opinion would matter if I shared it.',
    'I would trust SGA to treat ideas from all students fairly.'
  ], AGREE);
  b.checks(true, 'In the past year, which of these have you done? Select all that apply.', [
    'Voted in an SGA election', 'Filled out an SGA survey', 'Attended an SGA event or meeting', 'Talked to someone in SGA',
    'Signed a petition about something on campus', 'Contacted the university about a concern',
    'Posted about a campus issue on social media', 'Talked about it with friends only', 'None of these'
  ]);
  b.checks(true, 'What gets in the way of sharing ideas with SGA? Select all that apply.', [
    'I did not know how', 'I did not know who to tell', 'I did not think it would matter', 'I did not think SGA could change anything',
    'I was too busy', 'I did not want my name attached', 'I did not have an idea', 'Nothing gets in the way', 'Other'
  ]);

  // The idea
  b.section('The idea',
    'Here is the idea. It is early, and nothing is final.\n\n' +
    '- Any student can post an idea for campus, such as a change to dining, housing, transportation, or sustainability.\n' +
    '- Students can support the ideas they care about. In this version there is no limit on how many ideas you can support.\n' +
    '- Students can tap "I\'ll participate" if they would help work on an idea.\n' +
    '- SGA boards and committees pick ideas to work on. Because boards are run by student volunteers, each one can usually take on only 1 or 2 ideas at a time. The others wait on the list and keep their support.\n' +
    '- Students can follow an idea and see updates as the board works on it.\n' +
    '- SGA can use the numbers to show the university how many students want something.\n\n' +
    'The screenshots show an early version. Please judge the idea, not the colors.');
  b.image('feed', 'The list of ideas');
  b.image('idea', 'One idea');
  b.image('support', 'Supporting an idea and offering to help');
  b.scale(true, 'How likely would you be to use something like this?', 'Very unlikely', 'Very likely');
  b.checks(true, 'Which of these would you do? Select all that apply.', ['Post an idea', 'Support ideas I care about', 'Follow an idea to see updates', 'Offer to help work on an idea', 'Share an idea with friends or my club', 'None of these']);
  b.radio(false, 'Compared with how you can share ideas today, would this be better, worse, or about the same?', ['Better', 'About the same', 'Worse', 'Not sure']);
  b.text(true, 'What would make you more likely to use it?', 'Optional.');
  b.text(true, 'What would make you less likely to use it, or what worries you about it?', 'Optional.');

  // How it should work
  b.section('How it should work', 'These questions are about choices we have not made yet. Pick what feels right to you.');
  b.radio(true, 'Which way of supporting ideas would you prefer?', [
    'Unlimited: support as many ideas as you like. This shows how many students care about each idea.',
    'Limited: each student gets a few votes, for example 3. This shows which ideas matter most.',
    'No preference', 'Not sure'
  ]);
  b.radio(false, 'Should students be able to see how many people support an idea?', [
    'Yes, always', 'Yes, but only after an idea has been on the list for a while', 'No, only SGA should see the counts', 'Not sure'
  ], 'Showing counts can help people see what is popular, but it can also make people go along with the crowd.');
  b.grid(true, 'Boards can usually take on only 1 or 2 ideas at a time. How should a board choose which idea to start next? Rank these from 1st (most important) to 5th.', CRITERIA, RANKS, '', true);
  b.radio(true, 'Some ideas matter a lot to a small group of students. How should SGA treat them?', [
    'Same as every other idea: whichever has the most support goes first',
    'Give them extra consideration, even with fewer supporters',
    'Keep a separate list for them',
    'Not sure'
  ]);
  b.radio(true, 'If you supported an idea, how long would you be willing to wait for the board to start on it?', ['A few days', 'About 2 weeks', 'About a month', 'About a semester', 'As long as I can see progress', 'I would not wait']);
  b.checks(false, 'How would you want to hear about updates on an idea? Select all that apply.', ['Email', 'Phone notification', 'A monthly summary', 'SGA Instagram', 'Only when I check the site', 'I would not want updates']);
  b.radio(false, 'How often would you want updates?', ['Only when something changes', 'Every week', 'Every month', 'Not sure']);
  b.checks(true, '"I\'ll participate" means you are willing to help work on an idea. If you tapped it, how would you be comfortable being contacted? Select all that apply.', ['Northeastern email', 'Text message', 'Slack, GroupMe, or Discord', 'Through the site only', 'I would not want to be contacted']);
  b.radio(false, 'How soon would you expect to hear back after offering to help?', ['Within a day', 'Within 3 days', 'Within a week', 'Within 2 weeks', 'Any time is fine']);
  b.checks(false, 'What would you want to know before tapping "I\'ll participate"? Select all that apply.', ['How much time it takes', 'What the work would be', 'Who I would work with', 'Whether I need experience', 'Whether I would have to join SGA', 'Whether it counts as leadership or experience', 'Whether my name would be visible', 'Other']);
  b.radio(true, 'Who should be able to see that you supported an idea?', ['Nobody: only counts, no names', 'SGA leaders only', 'Anyone', 'Not sure']);
  b.radio(true, 'If you post an idea, should your name show on it?', ['Always show my name', 'Let me choose each time', 'Never show names', 'Not sure']);
  b.grid(true, 'How much do you agree with each statement?', [
    'I worry a few people could make an idea look more popular than it is.',
    'I worry my idea would get lost among others.',
    'I worry SGA would not act on the top ideas.',
    'I worry about unkind or inappropriate posts.',
    'I would feel comfortable posting an idea under my name.'
  ], AGREE);

  // What it should do
  b.section('What it should do', 'Last section.');
  b.checks(true, 'Which areas would you most want SGA to work on? Pick up to 3.', [
    'Dining and food access', 'Housing and residence life', 'Campus buildings and spaces', 'Transportation and shuttles', 'Gym and recreation',
    'Health and wellness', 'Academics and advising', 'Co-op and careers', 'Safety', 'Sustainability', 'Diversity, equity, and inclusion',
    'Student events and community', 'Global campus and international students', 'Costs and fees', 'Other'
  ], '', 3);
  b.text(true, 'What is one thing you would like to see change on campus?', 'Optional. A short answer is fine.');
  b.radio(false, 'Are you an officer in a student organization?', ['Yes', 'No', 'Prefer not to say']);
  b.radio(false, 'If yes: would your organization want to publicly back ideas it cares about?', ['Yes', 'Maybe', 'No', 'Not applicable']);
  b.text(true, 'Is anything about this idea confusing, or is anything missing?', 'Optional.');
  return form;
}

/* ---------- SGA leader survey ---------- */

function buildLeaderForm() {
  const form = newForm(
    'SGA leaders: help us design the proposals platform',
    'We are the Campus Affairs team. We are designing a website where students can post ideas, support them, and follow what happens next, and where SGA leaders can see what students want, post updates, and reach out to students who offer to help.\n\n' +
    'This is an early idea and nothing is final. We want honest answers, including if you think it would not work for you or your board.\n\n' +
    'This takes about ' + (CONFIG.coreOnly ? '7' : '10') + ' minutes. It is anonymous. Because SGA is small, we report counts, not percentages, and we will not report any group smaller than 5. Questions? ' + CONFIG.contactEmail,
    'Thank you! Your answers are anonymous. We will share what we learn with SGA leaders.'
  );
  const b = makeBuilder(form);

  b.heading('Your role', 'Used only to see whether answers differ across roles.');
  b.radio(true, 'What is your role in SGA?', ['President or Executive Vice President', 'Speaker of the Senate', 'Vice President', 'Director or board or committee chair', 'Senator', 'Board or committee member', 'Other']);
  b.radio(true, 'Which area do you work in most?', ['Office of the President', 'Academic Affairs', 'Campus Affairs', 'Diversity, Equity, and Inclusion', 'External Affairs', 'Operational Affairs', 'Student Involvement', 'Student Success', 'Senate', 'Other']);
  b.radio(true, 'How many terms have you served in SGA, including this one?', ['This is my first', '2', '3', '4 or more']);
  b.radio(false, 'About how many hours a week do you spend on SGA?', ['Under 2', '2 to 5', '6 to 10', '11 to 20', 'More than 20']);

  b.section('How you gather input today');
  b.checks(true, 'How do you learn what students want? Select all that apply.', [
    'Surveys', 'Tabling', 'Focus groups', 'Conversations with students I know', 'Conversations with student organization leaders', 'Social media',
    'Slack, GroupMe, or Discord', 'Administrators or staff', 'Email', 'We do not do this in a consistent way', 'Other'
  ]);
  b.radio(true, 'In a typical month, about how many students share an idea or concern with you or your board?', ['0 to 5', '6 to 20', '21 to 50', '51 to 100', 'More than 100', 'Not sure']);
  b.grid(true, 'How big a problem is each of these for you?', [
    'We restart outreach from scratch for each new initiative',
    'Surveys, tabling, and focus groups are scattered and hard to combine',
    'We are not sure what to build or prioritize',
    'We cannot show administration enough student support to get them to act',
    'We struggle to recruit students into SGA',
    'Knowledge is lost when leaders graduate',
    'Students do not hear back about what happened to their input'
  ], ['Not a problem', 'Minor', 'Moderate', 'Major', 'Not sure']);
  b.text(true, 'What is the biggest problem we did not list?', 'Optional.');

  b.section('Capacity and follow-through', 'These answers help set realistic rules, so please answer for what you could actually do.');
  b.radio(true, 'How many initiatives can your board or area realistically work on at the same time?', ['1', '2', '3', '4 or more', 'Not sure']);
  b.radio(true, 'How long does a typical initiative take from start to finish?', ['Under a month', '1 to 3 months', 'About a semester', 'About a year', 'More than a year', 'It varies a lot']);
  b.checks(false, 'When leaders graduate or change roles, what usually happens to unfinished initiatives? Select all that apply.', ['They are handed off with notes', 'A successor continues them', 'They are dropped', 'They are restarted', 'It depends', 'Not sure']);
  b.radio(true, 'How soon could you realistically respond to a student who offers to help?', ['Within a day', 'Within 3 days', 'Within a week', 'Within 2 weeks', 'Longer than 2 weeks']);
  b.radio(true, 'How often could you realistically post an update on an idea in progress?', ['Every week', 'Every 2 weeks', 'Every month', 'Only at major milestones']);
  b.radio(false, 'How many hours a week could your board spend on updates and contacting volunteers?', ['Under 1', '1 to 2', '3 to 5', 'More than 5']);

  b.section('The idea',
    'Here is the idea. It is early, and nothing is final.\n\n' +
    '- Any student can post an idea. Students can support as many ideas as they like and tap "I\'ll participate" if they would help.\n' +
    '- Each board works on only 1 or 2 ideas at a time and picks the next one from the list. Other ideas wait and keep their support.\n' +
    '- Leaders can post their own ideas, post updates that students see, and contact students who offered to help.\n' +
    '- Small red numbers on the tabs show what needs your attention.\n\n' +
    'The screenshots show an early version.');
  b.image('queue', 'The leader view: ideas in order of support');
  b.image('people', 'The leader view: students who offered to help');
  b.checks(true, 'Which would help you most? Pick up to 3.', [
    'Posting my own proposals', 'Seeing a ranked list of what students want', 'Posting updates to students', 'Tracking and contacting students who offer to help',
    'Sharing links or flyers for ideas', 'Exporting data to show administration', 'Managing duplicate ideas', 'Reviewing and moderating new posts',
    'Automatic reminders when something needs my attention'
  ], '', 3);
  b.checks(true, 'How would you want to find out what needs your attention, like new ideas, overdue updates, or volunteers to contact? Select all that apply.', [
    'Number badges in the tool', 'Email', 'Slack', 'A weekly digest', 'A dashboard page I open first', 'I would check the list myself'
  ]);

  b.section('How ideas should advance', 'Boards can only take on a few ideas at a time, so someone has to choose.');
  b.grid(true, 'How should a board choose which idea to start next? Rank these from 1st (most important) to 5th.', CRITERIA, RANKS, '', true);
  b.grid(true, 'How many student supporters would convince you that an idea is worth acting on?', [
    'A small idea (quick and low cost)', 'A medium idea', 'A large idea (long or expensive)'
  ], ['25', '50', '100', '200', '300', '500 or more', 'Support count should not decide this']);
  b.radio(true, 'Some ideas matter a lot to a small group of students. How should SGA treat them?', [
    'Same as every other idea: whichever has the most support goes first',
    'Give them extra consideration, even with fewer supporters',
    'Keep a separate list for them',
    'Not sure'
  ]);
  b.radio(true, 'Should a leader be able to start their own idea without waiting in the queue?', [
    'No: it waits in line like every other idea', 'Yes, with a reason that students can see', 'Yes, with no reason needed', 'It depends'
  ]);
  b.scale(false, 'How much freedom should a board have to pick ideas that are not the most supported?', 'None', 'A lot');

  b.section('Working with administration');
  b.checks(true, 'What do administrators respond to most? Pick up to 3.', [
    'The number of students who want it', 'Survey data', 'Examples from other universities', 'Cost estimates', 'Personal stories from students',
    'Support from student organizations', 'Media or social media attention', 'Support from faculty or staff', 'Not sure'
  ], '', 3);
  b.grid(true, 'If this many students supported an idea, how likely do you think administration would be to act on it?', [
    '50 students', '100 students', '250 students', '500 students', '1,000 students'
  ], ['Very unlikely', 'Unlikely', 'Neutral', 'Likely', 'Very likely', 'Not sure']);
  b.text(false, 'Have you shown student data to administration? What happened?', 'Optional.');

  b.section('Concerns and use', 'Last section.');
  b.grid(true, 'How much do you agree with each statement?', [
    'Showing a public list of student ideas could create conflict with administration.',
    'I worry about the work of reviewing and moderating posts.',
    'Unlimited support could make counts misleading.',
    'A public list could make boards look slow.',
    'Contacting volunteers through a tool would help us recruit.',
    'I would personally use this every week.'
  ], AGREE);
  b.scale(true, 'How likely is your board to use a tool like this regularly?', 'Very unlikely', 'Very likely');
  b.radio(false, 'Who on your board would own it?', ['The chair or director', 'The vice president', 'A designated member', 'No one yet', 'Not applicable']);
  b.text(true, 'What would stop you from using it?', 'Optional.');
  b.text(false, 'What is missing from this idea?', 'Optional.');
  return form;
}
