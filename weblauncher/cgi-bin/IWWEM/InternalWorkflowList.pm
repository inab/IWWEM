#!/usr/bin/perl -W

# $Id: Config.pm 256 2008-10-09 17:11:44Z jmfernandez $
# IWWEM/InternalWorkflowList.pm
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: José María Fernández González (C) 2007-2008
# Institutions:
# *	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
# *	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
#
# This file is part of IWWE&M, the Interactive Web Workflow Enactor & Manager.
# 
# IWWE&M is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# IWWE&M is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
# 
# You should have received a copy of the GNU Affero General Public License
# along with IWWE&M.  If not, see <http://www.gnu.org/licenses/agpl.txt>.
# 
# Original IWWE&M concept, design and coding done by JosÃ© MarÃ­a FernÃ¡ndez GonzÃ¡lez, INB (C) 2008.
# Source code of IWWE&M is available at http://trac.bioinfo.cnio.es/trac/iwwem

use strict;

package IWWEM::InternalWorkflowList;

use Carp qw(croak);
use base qw(IWWEM::AbstractWorkflowList);

use IWWEM::WorkflowCommon;
use IWWEM::UniversalWorkflowKind;

use vars qw($SNAPSHOTPREFIX $EXAMPLEPREFIX $ENACTIONPREFIX $WORKFLOWPREFIX);
$SNAPSHOTPREFIX='snapshot:';
$EXAMPLEPREFIX='example:';
$ENACTIONPREFIX='enaction:';
$WORKFLOWPREFIX='workflow:';

use vars qw($VIRTWORKFLOWDIR $VIRTJOBDIR $VIRTIDDIR $VIRTRESULTSDIR);

# Virtual dirs
$VIRTWORKFLOWDIR = 'workflows';
$VIRTJOBDIR = 'enactions';
$VIRTIDDIR = 'id';
$VIRTRESULTSDIR = $IWWEM::WorkflowCommon::RESULTSDIR;

use vars qw($ISRAWFILE $ISFORBIDDEN $ISEXAMPLE $ISINPUT $ISOUTPUT $ISRAWDIR $ISIDDIR $ISENDIR);
# undef means a raw file
$ISRAWFILE=undef;
# -1 means a forbidden file/dir
$ISFORBIDDEN=-1;
# 0, 1 or 2 mean a raw file which is handled as a result.
$ISEXAMPLE=0;
$ISINPUT=1;
$ISOUTPUT=2;
# 10 means a raw directory
$ISRAWDIR=10;
$ISIDDIR=11;
# 20 means an enaction/snapshot directory
$ISENDIR=20;

my($DEPSUBTREE)=[$IWWEM::WorkflowCommon::DEPDIR,$ISRAWDIR,[
		["^[0-9a-f].+[0-9a-f]\\.xml",undef,undef],
	]
];	# Contains only files and no catalog at all


my($ENACTSUBTREE)=[
	$DEPSUBTREE,
	[$VIRTRESULTSDIR,$ISRAWDIR,[
			['^.+',$ISIDDIR,[
					[$IWWEM::WorkflowCommon::INPUTSFILE,$ISINPUT,undef],
					[$IWWEM::WorkflowCommon::OUTPUTSFILE,$ISOUTPUT,undef],
					[$IWWEM::WorkflowCommon::ITERATIONSDIR,$ISRAWDIR,[
							["^[0-9]+",$ISRAWDIR,[
									[$IWWEM::WorkflowCommon::INPUTSFILE,$ISINPUT,undef],
									[$IWWEM::WorkflowCommon::OUTPUTSFILE,$ISOUTPUT,undef],
								]
							],
						]
					],
				]
			],
		]
	],	# Contains lots of directories
	[$IWWEM::WorkflowCommon::WORKFLOWFILE,$ISRAWFILE,undef],
	[$IWWEM::WorkflowCommon::SVGFILE,$ISRAWFILE,undef],
	[$IWWEM::WorkflowCommon::PDFFILE,$ISRAWFILE,undef],
	[$IWWEM::WorkflowCommon::PNGFILE,$ISRAWFILE,undef],
	[$IWWEM::WorkflowCommon::REPORTFILE,$ISRAWFILE,undef],
	[$IWWEM::WorkflowCommon::INPUTSFILE,$ISINPUT,undef],
	[$IWWEM::WorkflowCommon::OUTPUTSFILE,$ISOUTPUT,undef],
];

use vars qw(@PATHCHECK $WFKIND $ENKIND);

$WFKIND=[
	$VIRTWORKFLOWDIR,
	$IWWEM::Config::WORKFLOWDIR,
	[
		["^[0-9a-fA-F].+[0-9a-fA-F]",$ISIDDIR,[
				[$IWWEM::WorkflowCommon::EXAMPLESDIR,$ISRAWDIR,[
						[$IWWEM::WorkflowCommon::CATALOGFILE,$ISFORBIDDEN,undef],
						["^[0-9a-fA-F].+[0-9a-fA-F]\\.xml",$ISEXAMPLE,undef]
					]
				],	# Contains files
				[$IWWEM::WorkflowCommon::SNAPSHOTSDIR,$ISRAWDIR,[
						[$IWWEM::WorkflowCommon::CATALOGFILE,$ISFORBIDDEN,undef],
						["^[0-9a-fA-F].+[0-9a-fA-F]",$ISIDDIR,$ENACTSUBTREE]
					]
				],	# Contains directories
				$DEPSUBTREE,
				[$IWWEM::WorkflowCommon::WORKFLOWFILE,$ISRAWFILE,undef],
				[$IWWEM::WorkflowCommon::SVGFILE,$ISRAWFILE,undef],
				[$IWWEM::WorkflowCommon::PDFFILE,$ISRAWFILE,undef],
				[$IWWEM::WorkflowCommon::PNGFILE,$ISRAWFILE,undef],
			]
		],
	]
];

$ENKIND=[
	$VIRTJOBDIR,
	$IWWEM::Config::JOBDIR,
	[
		["^[0-9a-fA-F].+[0-9a-fA-F]",$ISIDDIR,$ENACTSUBTREE],
	]
];

@PATHCHECK=(
	$WFKIND,
	$ENKIND, 
	[
		$VIRTIDDIR,
		undef,
		[
			["^${WORKFLOWPREFIX}[^:]+",$ISIDDIR,undef],
			["^${ENACTIONPREFIX}[^:]+",$ISIDDIR,undef],
			["^${SNAPSHOTPREFIX}[^:]+:[^:]+",$ISIDDIR,undef],
			["^${EXAMPLEPREFIX}[^:]+:[^:]+",$ISEXAMPLE,undef],
		]
	]
);

##############
# Prototypes #
##############
sub new(;$);
sub genCheckList(\@);

###############
# Constructor #
###############

# Constructor must do the tasks done by gatherWorkflowList in the past
sub new(;$) {
	my($proto)=shift;
	my($class)=ref($proto) || $proto;
	
	my($self)=$proto->SUPER::new(@_);
	
	# Now, it is time to gather WF information!
	my($id)=undef;
	$id=$self->{id}  if(exists($self->{id}));
	my(@dirstack)=('.');
	my(@workflowlist)=();
	
	# If second parameter is not defined, then gather the list!
	if(scalar(@_)<2 || !defined($_[1])) {
		
		$id=''  unless(defined($id));
		my($baseListDir)=undef;
		my($listDir)=undef;
		my($subId)=undef;
		my($uuidPrefix)=undef;
		my($isSnapshot)=undef;
		if(index($id,'http://')==0 || index($id,'ftp://')==0) {
			$subId=$id;
			@dirstack=();
		} elsif(index($id,$ENACTIONPREFIX)==0) {
			$baseListDir=$VIRTJOBDIR;
			$listDir=$IWWEM::Config::JOBDIR;
			$uuidPrefix=$ENACTIONPREFIX;
			
			if($id =~ /^$ENACTIONPREFIX([^:]+)$/) {
				$subId=$1;
			}
		} elsif($id =~ /^$SNAPSHOTPREFIX([^:]+)/) {
			$baseListDir=$VIRTWORKFLOWDIR . '/'.$1.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR;
			$listDir=$IWWEM::Config::WORKFLOWDIR .'/'.$1.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR;
			$uuidPrefix=$SNAPSHOTPREFIX . $1 . ':';
			
			$isSnapshot=1;
			
			if($id =~ /^$SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
				$subId=$2;
			}
		} else {
			$baseListDir=$VIRTWORKFLOWDIR;
			$listDir=$IWWEM::Config::WORKFLOWDIR;
			$uuidPrefix=$WORKFLOWPREFIX;
			
			if($id =~ /^$WORKFLOWPREFIX([^:]+)$/) {
				$subId=$1;
			} elsif(length($id)>0) {
				$subId=$id;
			}
		}
		
		# Looking for workflows
		foreach my $dir (@dirstack) {
			my($WFDIR);
			my($fdir)=$listDir.'/'.$dir;
			if(opendir($WFDIR,$fdir)) {
				my($entry);
				my(@posdirstack)=();
				my($foundworkflowdir)=undef;
				while($entry=readdir($WFDIR)) {
					next if(index($entry,'.')==0);
					
					my($fentry)=$fdir.'/'.$entry;
					my($rentry)=($dir ne '.')?($dir.'/'.$entry):$entry;
					if($entry eq $IWWEM::WorkflowCommon::WORKFLOWFILE) {
						$foundworkflowdir=1;
					} elsif(-d $fentry && (!defined($subId) || ($subId eq $entry))) {
						push(@posdirstack,$rentry);
					}
				}
				closedir($WFDIR);
				# We are only saving found subdirectories when
				# this is not a workflow directory
				if(defined($foundworkflowdir)) {
					push(@workflowlist,$dir);
				} else {
					push(@dirstack,@posdirstack);
				}
			}
		}
		
		$self->{WORKFLOWLIST}=\@workflowlist;
		$self->{baseListDir}=$baseListDir;
		$self->{GATHERED}=[$listDir,$uuidPrefix,$isSnapshot];
			
	}
	
	return bless($self,$class);
}

# Static method
sub UnderstandsId($) {
	# Very special case for multiple inheritance handling
	# This is the seed
	my($self)=shift;
	my($class)=ref($self) || $self;
	
	my($id)=shift;
	
	return !defined($id) || index($id,$WORKFLOWPREFIX)==0 || index($id,$ENACTIONPREFIX)==0 || index($id,$SNAPSHOTPREFIX)==0 || (index($id,'/')==-1 && index($id,':')==-1 );
}

sub getDomainClass() {
	return 'IWWEM';
}

#	my($wf,$listDir,$uuidPrefix,$isSnapshot)=@_;
sub getWorkflowInfo($@) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($parser,$context)=($self->{PARSER},$self->{CONTEXT});
	my($wf,$listDir,$uuidPrefix,$isSnapshot)=@_;
	
	my($retnode)=undef;
	eval {
		my($relwffile)=undef;
		my($wfdir)=undef;
		
		my($wffile)=undef;
		
		my($wfcat)=undef;
		my($examplescat) = undef;
		my($snapshotscat) = undef;
		my($wfresp)=undef;
		
		my($regen)=1;
		unless(index($wf,'http://')==0 || index($wf,'ftp://')==0) {
			$relwffile=$wf.'/'.$IWWEM::WorkflowCommon::WORKFLOWFILE;
			$wfdir=$listDir.'/'.$wf;
			$wffile=$listDir.'/'.$relwffile;
			$wfcat=$wfdir.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
			$examplescat = $wfdir .'/'. $IWWEM::WorkflowCommon::EXAMPLESDIR . '/' . $IWWEM::WorkflowCommon::CATALOGFILE;
			$snapshotscat = $wfdir .'/'. $IWWEM::WorkflowCommon::SNAPSHOTSDIR . '/' . $IWWEM::WorkflowCommon::CATALOGFILE;
			$wfresp=$wfdir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE;
			
			my(@stat_selffile)=stat($FindBin::Bin .'/IWWEM/InternalWorkflowList.pm');
			my(@stat_selffile2)=();
			@stat_selffile2=stat($FindBin::Bin .'/IWWEM/Taverna1WorkflowKind.pm');
			@stat_selffile=@stat_selffile2  if($stat_selffile2[9]>$stat_selffile[9]);
			@stat_selffile2=stat($FindBin::Bin .'/IWWEM/Taverna2WorkflowKind.pm');
			@stat_selffile=@stat_selffile2  if($stat_selffile2[9]>$stat_selffile[9]);
			
			my(@stat_wfcat)=stat($wfcat);
			if(scalar(@stat_wfcat)>0 && $stat_wfcat[9]>$stat_selffile[9]) {
				my(@stat_wffile)=stat($wffile);

				if(scalar(@stat_wffile)==0 || $stat_wfcat[9]>$stat_wffile[9]) {
					my(@stat_examplescat)=stat($examplescat);

					if(scalar(@stat_examplescat)>0 && $stat_wfcat[9]>$stat_examplescat[9]) {
						my(@stat_snapshotscat)=stat($snapshotscat);

						if(scalar(@stat_snapshotscat)>0 && $stat_wfcat[9]>$stat_snapshotscat[9]) {
							my(@stat_wfresp)=stat($wfresp);
							
							if(scalar(@stat_wfresp)>0 && $stat_wfcat[9]>$stat_wfresp[9]) {
								# Catalog is outdated related to snapshots
								$regen=undef;
							}
						}
					}
				}
			}
		} else {
			$wffile=$wf;
		}
		
		# With this variable it is possible to swtich among different 
		# representations
		my($wfKind)='UNIVERSAL';
		#my($wfcatmutex)=LockNLog::SimpleMutex->new($wfdir.'/'.$IWWEM::WorkflowCommon::LOCKFILE,$regen);
		if(defined($regen)) {
			my($uuid)=$uuidPrefix.$wf;
			$retnode = $self->{WFH}{$wfKind}->getWorkflowInfo($wf,$uuid,$listDir,$relwffile,$isSnapshot);
			
			if(defined($retnode) && defined($wfcat)) {
				my($outputDoc)=$retnode->ownerDocument();
				my($release)=$retnode->firstChild();
				while(defined($release) && ($release->nodeType()!=XML::LibXML::XML_ELEMENT_NODE || $release->localname() ne 'release')) {
					$release=$release->nextSibling();
				}
				
				# Now, the responsible person
				my($responsibleMail)='';
				my($responsibleName)='';
				eval {
					my($res)=undef;
					if(defined($isSnapshot)) {
						my $cat = $parser->parse_file($listDir.'/'.$IWWEM::WorkflowCommon::CATALOGFILE);
						my($transwf)=IWWEM::WorkflowCommon::patchXMLString($wf);
						my(@snaps)=$context->findnodes("//sn:snapshot[\@uuid='$transwf']",$cat);
						$res=$snaps[0]  if(scalar(@snaps)>0);
					} elsif(defined($wfresp)) {
						$res = $parser->parse_file($wfresp)->documentElement();
					}
					if(defined($res)) {
						$responsibleMail=$res->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
						$responsibleName=$res->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME);
					}
				};
	
				$release->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
				$release->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME,$responsibleName);
				
				# The date
				$release->setAttribute('date',LockNLog::getPrintableDate((stat($wffile))[9]));
				
				# Adding links to its graphical representations
				my($refnode)=$release->firstChild();
				while(defined($refnode) && ($refnode->nodeType()!=XML::LibXML::XML_ELEMENT_NODE || $refnode->localname() ne 'description')) {
					$refnode=$refnode->nextSibling();
				}
				
				my($gfile,$gmime);
				while(($gfile,$gmime)=each(%IWWEM::WorkflowCommon::GRAPHREP)) {
					my $rfile = $wf.'/'.$gfile;
					# Only include what has been generated!
					if( -f $listDir.'/'.$rfile) {
						my($gchild)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'graph');
						$gchild->setAttribute('mime',$gmime);
						$gchild->appendChild($outputDoc->createTextNode($rfile));
						$release->insertAfter($gchild,$refnode);
						$refnode=$gchild;
					}
				}
	
				# Now, including dependencies
				my($DEPDIRH);
				my($depreldir)=$wf.'/'.$IWWEM::WorkflowCommon::DEPDIR;
				my($depdir)=$listDir.'/'.$depreldir;
				if(opendir($DEPDIRH,$depdir)) {
					my($entry);
					while($entry=readdir($DEPDIRH)) {
						next  if(index($entry,'.')==0);

						my($fentry)=$depdir.'/'.$entry;
						if(-f $fentry && $fentry =~ /\.xml$/) {
							my($depnode) = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'dependsOn');
							$depnode->setAttribute('sub',$depreldir.'/'.$entry);
							$$release->insertAfter($depnode,$refnode);
							$refnode=$depnode;
						}
					}

					closedir($DEPDIRH);
				}
				
				# Now importing the examples catalog
				eval {
					if(defined($examplescat)) {
						my($examples)=$parser->parse_file($examplescat);
						for my $child ($examples->documentElement()->getChildrenByTagNameNS($IWWEM::WorkflowCommon::WFD_NS,'example')) {
							$release->appendChild($outputDoc->importNode($child));
						}
					}
				};
				if($@) {
					$release->appendChild($outputDoc->createComment('Unable to parse examples catalog!'));
				}
				
				# And the snapshots one!
				eval {
					if(defined($snapshotscat)) {
						my($snapshots)=$parser->parse_file($snapshotscat);
						for my $child ($snapshots->documentElement()->getChildrenByTagNameNS($IWWEM::WorkflowCommon::WFD_NS,'snapshot')) {
							$release->appendChild($outputDoc->importNode($child));
						}
					}
				};
				if($@) {
					$release->appendChild($outputDoc->createComment('Unable to parse snapshots catalog!'));
				}
			
				$outputDoc->toFile($wfcat);
			}
			
		} else {
			#$wfcatmutex->mutex(sub {
				$retnode=$parser->parse_file($wfcat)->documentElement();
			#});
		}
	};
	
	if($@ || !defined($retnode)) {
		my($outputDoc)=XML::LibXML::Document->new('1.0','UTF-8');
		$retnode=$outputDoc->createComment("Unable to process $wf due ".$@);
	}
	
	return $retnode;
	
}

#		my($query,$responsibleMail,$responsibleName,$licenseURI,$licenseName,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$basedir,$dontPending)=@_;
sub parseInlineWorkflows($$$$$$;$$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	return $self->{WFH}{$IWWEM::Taverna1WorkflowKind::XSCUFL_MIME}->parseInlineWorkflows(@_);
}

#	my($query,$randname,$randdir,$isCreation,$WFmaindoc,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$doSaveDoc)=@_;
sub patchWorkflow($$$$$;$$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	return $self->{WFH}{$IWWEM::Taverna1WorkflowKind::XSCUFL_MIME}->patchWorkflow(@_);
}

sub launchJob() {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($wfile,$jobdir,$p_baclava,$inputFileMap,$saveInputsFile)=@_;
}

# Static package method
sub genCheckList(\@) {
	my($p_IAR)=@_;
	my($retval)=undef;
	foreach my $token (@{$p_IAR}) {
		if(defined($retval)) {
			$retval .= ', '.$token->[0];
		} else {
			$retval=$token->[0];
		}
	}
	return $retval;
}

1;
