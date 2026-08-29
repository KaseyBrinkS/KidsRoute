export const PRIVACY_POLICY = {
  title: 'Privacy Policy',
  lastUpdated: 'August 2026',
  sections: [
    {
      heading: 'Who we are',
      blocks: [
        'KidsRoute is a neighborhood coordination app that helps families organize safe group walks for children to school and after-school activities. KidsRoute is operated by an individual developer based in New York City.',
      ],
    },
    {
      heading: 'What we collect',
      blocks: [
        'When you create an account and use KidsRoute, we collect:',
        {
          type: 'list',
          items: [
            'Your name and email address (from Google or Apple sign-in, or directly if you use email/password)',
            'Your phone number (entered by you in Settings)',
            'Your home address — street number, street name, and zip code only (entered by you in Settings)',
            "Your children's first names, grades, and school",
            "Your children's after-school activity details — location, days, and times",
            'Walk history — timestamps of when your child was picked up and dropped off',
          ],
        },
      ],
    },
    {
      heading: 'What we do NOT collect',
      blocks: [
        {
          type: 'list',
          items: [
            'We never collect apartment numbers or full addresses',
            'We never collect payment information',
            'We never track your location in real time',
            "We never show map views of any family's location",
            'We do not collect any data directly from children — all accounts are created and managed by parents',
          ],
        },
      ],
    },
    {
      heading: 'How we use your data',
      blocks: [
        'Your data is used only to:',
        {
          type: 'list',
          items: [
            'Match your family with nearby families heading to the same destination at the same time',
            'Coordinate group walks and notify group members',
            'Record walk history so parents can see when their child arrived safely',
            'Send SMS or email notifications about group matches and walk updates (only if you opt in)',
          ],
        },
      ],
    },
    {
      heading: 'Who sees your information',
      blocks: [
        {
          type: 'list',
          items: [
            "Your profile, children's names, and address are never publicly visible",
            'Your phone number is only shared with families in groups you have actively joined',
            'Other families can only see your information if you are both matched in the same walk group',
            'KidsRoute staff (currently just the developer) can see account information for safety and support purposes',
          ],
        },
      ],
    },
    {
      heading: 'Data storage',
      blocks: [
        'All data is stored securely in Google Firebase, which is SOC 2 compliant. Data is stored in the United States.',
      ],
    },
    {
      heading: 'Your rights',
      blocks: [
        'You can at any time:',
        {
          type: 'list',
          items: [
            "Edit or delete your children's profiles in Settings",
            'Remove your activities',
            'Leave any walk group',
            'Delete your account and all associated data by contacting us at privacy@kidsroute.org or using the Delete Account option in Settings',
            'Request a copy of your data by emailing privacy@kidsroute.org',
          ],
        },
      ],
    },
    {
      heading: "Children's privacy (COPPA)",
      blocks: [
        'KidsRoute accounts are for parents and guardians only. We do not knowingly collect personal information directly from children under 13. Parents control all information entered about their children. If you believe a child has created an account without parental consent, please contact us immediately at privacy@kidsroute.org.',
      ],
    },
    {
      heading: 'Changes to this policy',
      blocks: [
        'We may update this policy as the app grows. We will notify you of significant changes via email or an in-app notice.',
      ],
    },
    {
      heading: 'Contact',
      blocks: ['Questions about privacy? Email us at privacy@kidsroute.org'],
    },
  ],
}
