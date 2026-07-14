/* Review quotes for /reviews, sourced from user-provided docx files (July 2026). */

export interface Review {
  quote: string;
  author: string;
}

export interface ReviewCategory {
  id: string;
  name: string;
  reviews: Review[];
}

export const reviewCategories: ReviewCategory[] = [
  {
    id: "general",
    name: "General Testimonials",
    reviews: [
      {
        quote:
          "I am a campus pastor and chaplain who has been reading your articles. I look for important and useful material for our 15,000 students.",
        author: "Francois, Canada",
      },
      {
        quote:
          "As a pastor with the youth and children, I have found the material very useful for discipleship.",
        author: "Valentine, Europe",
      },
      {
        quote:
          "Your teachings have now become our teaching manual in our home cell groups (home fellowships). We will use the resources on your site and Africa shall be saved.",
        author: "Pastor Amos, Kenya",
      },
      {
        quote:
          "Many, many thanks for this great work to our country of Nepal. We are praying for God to use this website in Nepal for Hindus. Thank you.",
        author: "Rev. Daniel, Renew Foundation Mission, Nepal",
      },
      {
        quote:
          "I am sharing your articles with 3,000 Sudanese refugees. I am also sharing your discipleship material with people inside and outside the ministry.",
        author: "Pastor Panyuan, Sudan",
      },
      {
        quote:
          "I have gone through your website and I like your teaching materials. I would like to translate your Bible study materials and devotionals into HINDI and MARATHI languages.",
        author: "Pastor Sharad, India",
      },
      {
        quote:
          "This has opened my spiritual eyes. This has helped me so much in my ministry, and many people have been blessed through my sharing your material. I read each of the articles contributed here and I meditate on it.",
        author: "Pastor Letthuama, India",
      },
      {
        quote:
          "I am a minister of the Gospel for over thirty years now. I have never seen the Gospel so intelligently presented to a modern man like this.",
        author: "Pastor Ayodele, Nigeria",
      },
      {
        quote:
          "I have been richly blessed by the write-up. I am using your articles to teach others in the vineyard of God. I am Priest of the Anglican Communion Church, and an Evangelist. Thanks.",
        author: "Rev. Ayeni, Nigeria",
      },
      {
        quote:
          "This is great information that I will use for Bible study in my church. Thanks.",
        author: "Pastor Samuel, Liberia",
      },
      {
        quote:
          "I found it very helpful to lead more people to Christ to populate heaven. It's powerful. Thank you!!",
        author: "Pastor Matthias, New Guinea",
      },
      {
        quote:
          "I have been going through the studies at your web site, and I am deeply inspired with all the teaching. These are such wonderful Bible studies and teaching materials you have put together for all the nations to use. You people are heroes in that you have found a way to spread the word of the Lord Jesus Christ to us in a Muslim country.",
        author: "Pastor Asim, Pakistan",
      },
      {
        quote:
          "I like all your articles. I have been printing them and distributing them to my members. Well written, well researched.",
        author: "Bishop Josue, Philippines",
      },
      {
        quote:
          "I’m a gospel minister, thankful that there are messages online—very helpful materials for the ministry at church and for social media friends.",
        author: "Pastor Martin, Philippines",
      },
      {
        quote:
          "I'm a reverend at the African free congregation church. I wish to spread the good news about God through Jesus Christ. Thanks to have this website to lead me. It has been long I have been looking for this kind of inspiration.",
        author: "Godfrey, South Africa",
      },
      {
        quote:
          "This website has wonderful teachings that every Christian should know. There are a lot of deceptions in the world today that easily deceive those who don’t know the word of God. We will use these teachings on your website to help other Christians.",
        author: "Pastor James, South Africa",
      },
      {
        quote:
          "It is a powerful video that has brought me face to face with my own sinfulness and personal weakness. I found that, I lost my Christian life a long time ago. There is now an urgent need to turn back, come back, repent, reconcile, pray more and better than I used to do. Continue with it and make it more available, even for the common man. Thanks.",
        author: "Reverend Fr. Remigio, Uganda",
      },
      {
        quote:
          "As a Pastor in England for 28 years, I am still learning. Your article and book is a most glorious and faithful contribution to a believer's faith. God bless your faithfulness to Him.",
        author: "Reverend Vincent, United Kingdom",
      },
      {
        quote:
          "I am a retired Pastor doing bible study at home for new believers and older persons and your articles has always helped in studies for new believers.",
        author: "Frank, U.S.A.",
      },
      {
        quote:
          "I love your website. I am using many of the resources as study guides for a group of teens in a youth class at our church. They really like that the questions are validated through historical and secular tests. Thanks!",
        author: "Anonymous, U.S.A.",
      },
      {
        quote:
          "Your writings are very valuable.  I thank you very much to God for your life. Your teachings will help me grow and become a better evangelist.",
        author: "Nelida, Venezuela",
      },
      {
        quote:
          "This is the most inspiring website that I have come across so far about our Lord and Saviour Jesus Christ. I am going to use some of these materials to equip the believers as foundational teachings.",
        author: "Dr. Bernard, Zambia",
      },
      {
        quote:
          "It was wonderful, I am a changed pastor because of the word of God on this website. I know my ministry will change and the teachings in my ministry will change after reading the articles on your website. May God bless you.",
        author: "Pastor Lukumba, Zambia",
      },
    ],
  },
  {
    id: "evidence",
    name: "Evidence Resources Reviews",
    reviews: [
      {
        quote:
          "WOW!!! How mind blowing!!! I’m greatly impressed with the compelling evidence from your articles on the death, burial and resurrection of Jesus. I am publishing your article in our church’s newspaper and webpage. Thanks very much.",
        author: "Pastor Erl, Jamaica",
      },
      {
        quote:
          "I’ve never read anything so compelling about Jesus. I found this article an immeasurable comfort. I had to stop reading several times to thank Jesus for his supreme sacrifice. God bless richly the promoter of this site. During this morning I’ve done nothing but read this article. God is Wonderful.",
        author: "Pastor Agba, Nigeria",
      },
      {
        quote:
          "This is one of the best researched evidences of the Resurrection of the Lord. It has renewed my faith personally and will continue to help me preach Christ’s resurrection with greater boldness, trusting the Holy Spirit for salvation of souls and more supernatural testimonies of God’s marvelous doings.",
        author: "Pastor Michael, Nigeria",
      },
      {
        quote:
          "I came across this article providentially and my faith in Christ has been strengthened. As I was reading it, the evidences and proofs were simply electrifying! As a pastor, I have taught the resurrection from the accounts of the four gospel evangelists Matthew, Mark, Luke and John in my church’s Bible Study classes. Thank you so much for such a powerful article.",
        author: "Pastor Samuel, Nigeria",
      },
      {
        quote:
          "Thank you very much for this timely lesson on Lord Jesus Christ’s death and resurrection. I started to read it, then started taking notes—8 pages handwritten. I want you to know that you do not toil in vain. Let this Jesus who is real in human history bless you and your ministry. Thank you again.",
        author: "Pastor Bekele, Ethiopia",
      },
      {
        quote:
          "I thank God for this article about Jesus’ deity. It is the best tool for the enlightenment of the local pastors and lay leaders that we train in the villages, and especially for my responsibilities of teaching the youth. I have been given the answers that I lacked. God bless you. Great apologetic work.",
        author: "Pastor Andy, Malawi",
      },
      {
        quote:
          "This website has broadened my knowledge and given me a better and clearer understanding about the DEITY OF JESUS CHRIST. I am better armed now.",
        author: "Pastor Jack, Nigeria",
      },
      {
        quote:
          "I’m really grateful for the knowledge I received from you. My congregation will now know exactly who Christ really is—Jehovah of the Old Testament is Christ in the New Testament. Thank you so much.",
        author: "Pastor Emmanuel, South Africa",
      },
      {
        quote:
          "As a Presbyterian minister, I encounter many people who reject the Bible as fantasy fiction but accept the teaching of The Da Vinci Code as truth. Your website is a great encouragement to those of us who are called to preach Christ crucified and Risen.",
        author: "Pastor Peter, Australia",
      },
      {
        quote:
          "I’m a pastor in the Middle East and love the way you approach the arguments against Jesus and his resurrection from the point of view of a skeptic who becomes a believer. It is sometimes difficult to reason with Muslims here because they want to believe the deception of the Quran. Well done!!! OUTSTANDING.",
        author: "Pastor, Qatar",
      },
      {
        quote:
          "This is an amazing article; a well researched and scholarly piece. As a missionary, it has broadened my knowledge on how to answer skeptics on Jesus Christ. Thank you so very much for this invaluable information.",
        author: "Rev. Adams, Nigeria",
      },
      {
        quote:
          "This revelation has increased my faith in God and boldness to continue preaching the gospel without fear or doubt. God bless the author of these articles.",
        author: "Pastor Stanley, Kenya",
      },
      {
        quote:
          "I’m a pastor at a local church in the nomadic community. After reading through most of the articles on your website, I’ve seen their lives transformed by the truth of who Jesus is and why he came. The articles have helped me in relation to how they perceive God.",
        author: "Pastor Roselyne, Norway",
      },
      {
        quote:
          "I love this website. This is apologetics at its concise best. Thank you for your online ministry. God bless you!",
        author: "Pastor Benedicto, Colombia",
      },
      {
        quote:
          "This article is inspirational and life changing. Reading this article opened my spiritual senses to new things about Jesus. I will be grateful if I can receive such powerful articles that I can use for my outreach and discipleship programs for my members that I can print for distribution. Once again, thanks so much.",
        author: "Rev. Paul, Nigeria",
      },
    ],
  },
  {
    id: "growth",
    name: "Growth Resources Reviews",
    reviews: [
      {
        quote:
          "This has been a tremendous faith-booster to me. My confidence in the preaching of this awesome Jesus my God and my King is greatly increased and sharpened. These articles are glorious tools for Christian living, teaching, and the work of ministry. I know the Holy Spirit led me here, and I am grateful to Jesus Christ my God. More grace to you. God bless you.",
        author: "Pastor Wamey, Cameroon",
      },
      {
        quote:
          "WOW, I love the articles and discipleship booklet! I am learning so many new things which will help me and my people. Thank you.",
        author: "Pastor Vansanta, Sri Lanka",
      },
      {
        quote:
          "The amazing videos are really delivering the message to the whole world about how we should be filled with the Holy Spirit. I am very grateful to share these within my ministry and extend to others. Thanks.",
        author: "Pastor Angelo, Kenya",
      },
      {
        quote:
          "I have been going through the studies at your website, and I am deeply inspired with all of the teaching. I am from the Islamic Republic of Pakistan where it is difficult to have radio and TV channels for preaching purposes. These are such wonderful Bible studies and teaching materials you have put together for all the nations to use. You people are heroes in that you have found a way to spread the word of the Lord Jesus Christ to us in a Muslim country.",
        author: "Pastor Asim, Pakistan",
      },
      {
        quote:
          "I’m so blessed with your presentation. I’m touched. It’s my desire to use your lesson materials for the new believers. I hope you can help me to reach our own people to be discipled. I’d been a church planter for several years. Thanks and God bless!",
        author: "Pastor Terry, Philippines",
      },
      {
        quote:
          "As pastor to a new church in Bolivia, we would like to have more revealing studies of the Word in order to continue to build and edify our new congregation in Robere. I had studies carried out in the city of Cochabamba for more than 30 years, in seminaries and pastoral meetings. The studies received from you are truly inspirational and contain much revelation. Thank you.",
        author: "Pastor Jorge, Bolivia",
      },
      {
        quote:
          "Very helpful study guide especially for us that lack resources. Please continue your ministry. We are living in the small island of the Philippines. Can I translate it in our language so that our people can also understand?",
        author: "Pastor Rogelio Valdez, Urdaneta, Philippines",
      },
    ],
  },
  {
    id: "church",
    name: "Church Resources Reviews",
    reviews: [
      {
        quote:
          "I felt extreme emptiness during my four years of pastoring a church. I realised that I am not really fulfilling the Great Commission. I was just making ‘shows’—always ‘jumping’ in the church, ‘shouting’ the word of God like a lot of pastors, instead of making disciples. I pastored a church full of ‘church goers’ not disciples. I realised that not only did I need to learn how to make a disciple, but I also need myself to be made a disciple. I discovered that becoming a disciple is not a question of graduating from pastor school or Bible institute. The Adventure of Living with Jesus discipleship booklet has transformed my life and my understanding about what it is to live for Christ and trust His Word. People are touched and amazed when I am teaching it to them.",
        author: "Pastor Assah, Togo",
      },
      {
        quote:
          "After college I started preaching Jesus in open air, home cells and fellowships, and I started a church. Then through my phone God showed me the JO APP and I started to read the word of God and apply it in my heart as well as teaching it to others. Your teaching has made a lot of souls come to Jesus in both Malawi and Mozambique. This App has helped me to be grounded in the word of God. I preach to thousands of people every Sunday. I have about 200 to 300 churches both in Malawi and Mozambique, teaching 600 pastors. I started already translating the articles into the Chichewa and Sena Languages by making some tracts and sharing them with people.",
        author: "Pastor Stanley, Malawi",
      },
      {
        quote:
          "I’m blessed by your teachings. This website has now become our teaching manual in our home cell groups (home fellowships). We have 12 home cells in our growing church. May God bless you so much. We will use what you have made available on your site and Africa shall be saved.",
        author: "Pastor Amos, Kenya",
      },
      {
        quote:
          "I have benefited a lot from your website. It has given me a lot of insight into understanding some major topics in the Bible, such as who is Jesus and many other events in the Bible. As a pastor, the quality of my sermons has been enhanced from what I get from you. May God richly bless you all. Thank you.",
        author: "Pastor Moses, Ghana",
      },
      {
        quote:
          "I’m a minister of the Gospel and I believe this discipleship book will really be of help to me in my teaching ministry, considering the impact on me from what I have just read from your JesusOnline. Thanks.",
        author: "Pastor Clement, Ghana",
      },
      {
        quote:
          "Thanks to your website I now know the connection between discipleship and evangelism! Your booklet is helping us a great deal! I have been following the lessons for discipleship you send to me; we are edified each and every time we share these lessons. You and your ministry are indeed a great blessing to us!",
        author: "Pastor Emmanuel, Uganda",
      },
      {
        quote:
          "I thank you for your article which is helping me as a youth leader at the schools and in the church I’m pastoring. We lack Christian materials and I have many Bible studies in which we can use your material.",
        author: "Pastor Boniface, Rwanda",
      },
      {
        quote:
          "Thanks for the information you provided through the internet. They are very helpful for me because I would use this information in my sermons. So, thanks again for providing these useful materials for someone like me to use for topics each Sunday.",
        author: "Rev. Harry, Micronesia",
      },
    ],
  },
];
